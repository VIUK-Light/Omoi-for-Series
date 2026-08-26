#!/usr/bin/env node
/**
 * Omoi for 全シリーズの公開用JSONを検証するスモーク監査。
 * Couplesの正本一致は verify-couples-dataset.mjs が担当し、
 * このスクリプトは3シリーズ共通の公開データ契約(件数・スキーマ・ID一意・
 * 質問文の重複なし)を確認する。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const expected = {
  couples: { total: 701, sourceCounts: { loves: 698, editorial: 3 } },
  family: { total: 200, sourceCounts: { editorial: 200 } },
  friends: { total: 200, sourceCounts: { editorial: 200 } },
};
const failures = [];
const forbiddenTexts = ["なぎささん大好きだよ！"];
const MAX_RELEASE_TEXT_LENGTH = 160;
const records = [];

function normalizeQuestionText(text) {
  return text.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function fail(message) {
  failures.push(message);
  console.error(`  ✗ ${message}`);
}

for (const [audience, contract] of Object.entries(expected)) {
  const path = resolve(root, `shared/questions/${audience}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${audience}: JSONを読み込めません: ${error.message}`);
    continue;
  }

  if (!Array.isArray(data)) {
    fail(`${audience}: 配列ではありません`);
    continue;
  }
  if (data.length !== contract.total) fail(`${audience}: 件数 ${data.length} (期待 ${contract.total})`);

  const ids = new Set();
  // 重複テキスト検査は編集質問(editorial)のみ対象とする。
  // Loves由来カードは正本ソースへの忠実性を優先するため、歴史的な重複を許容する。
  const editorialTexts = new Map(); // 質問文 -> 初出のID
  const lovesTexts = new Map();     // 質問文 -> 初出のID
  const levels = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sources = {};
  data.forEach((card) => records.push({ ...card, audience }));
  data.forEach((card, index) => {
    if (ids.has(card.id)) fail(`${audience}[${index}]: ID重複 ${card.id}`);
    ids.add(card.id);
    const normalizedText = typeof card.text === "string" ? card.text.trim() : "";
    if (normalizedText !== "") {
      if (card.source === "editorial") {
        const firstSeenId = editorialTexts.get(normalizedText) ?? lovesTexts.get(normalizedText);
        if (firstSeenId) fail(`${audience}[${index}]: テキスト重複 ${card.id} (${firstSeenId} と同一)`);
        editorialTexts.set(normalizedText, card.id);
        lovesTexts.set(normalizedText, card.id);
      } else {
        lovesTexts.set(normalizedText, card.id);
      }
    }
    if (card.audience !== audience) fail(`${audience}[${index}]: audience=${card.audience}`);
    if (!Number.isInteger(card.level) || card.level < 1 || card.level > 4) fail(`${audience}[${index}]: level不正`);
    else levels[card.level] += 1;
    if (typeof card.text !== "string" || card.text.trim() === "") fail(`${audience}[${index}]: textが空`);
    if (typeof card.text === "string" && card.text.length > MAX_RELEASE_TEXT_LENGTH) fail(`${audience}[${index}]: textが長すぎます (${card.text.length}文字)`);
    if (typeof card.category !== "string" || card.category.trim() === "") fail(`${audience}[${index}]: categoryが空`);
    if (!Object.hasOwn(contract.sourceCounts, card.source)) fail(`${audience}[${index}]: source不正 ${card.source}`);
    sources[card.source] = (sources[card.source] || 0) + 1;
    if (forbiddenTexts.includes(card.text)) fail(`${audience}[${index}]: 個人的な固定文言が残っています`);
  });

  for (const level of [1, 2, 3, 4]) {
    if (levels[level] < 15) fail(`${audience}: Level ${level} が ${levels[level]} 問しかなく、15問セッションを満たせません`);
  }
  for (const [source, count] of Object.entries(contract.sourceCounts)) {
    if (sources[source] !== count) fail(`${audience}: source=${source} が ${sources[source] || 0} 件 (期待 ${count})`);
  }
  console.log(`${audience}: ${data.length}問 / L1-L4 ${Object.values(levels).join('-')} / sources ${JSON.stringify(sources)}`);
}

const textOwners = new Map();
for (const record of records) {
  const key = normalizeQuestionText(record.text);
  if (!textOwners.has(key)) textOwners.set(key, []);
  textOwners.get(key).push(record);
}
for (const owners of textOwners.values()) {
  if (new Set(owners.map((record) => record.audience)).size > 1) {
    fail(`シリーズ間の同一質問文: ${owners.map((record) => `${record.audience}/${record.id}`).join(' | ')}`);
  }
}
const crossAudienceDuplicateGroups = [...textOwners.values()]
  .filter((owners) => new Set(owners.map((record) => record.audience)).size > 1);
console.log(`シリーズ間の完全一致: ${crossAudienceDuplicateGroups.length}グループ`);

if (failures.length) {
  console.error(`結果: FAIL — ${failures.length}件`);
  process.exit(1);
}
console.log("結果: PASS — 3シリーズの公開データ契約に適合しています。");
