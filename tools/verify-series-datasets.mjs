#!/usr/bin/env node
/**
 * Omoi for 5シリーズの公開用JSONと、新シリーズの未公開ゲートを検証する。
 * Couplesの正本一致は verify-couples-dataset.mjs が担当し、
 * 既存3シリーズの件数・スキーマ・ID・重複を維持し、新2シリーズのスキーマ、
 * レビュー状態、公開マニフェストとの一致を確認する。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { textSimilarity } from "./validate-grok-questions.mjs";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const expected = {
  couples: { total: 701, sourceCounts: { loves: 698, editorial: 3 } },
  family: { total: 200, sourceCounts: { editorial: 200 } },
  friends: { total: 200, sourceCounts: { editorial: 200 } },
};
const newSeries = ["adults", "self-care"];
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

let manifest;
try {
  manifest = JSON.parse(readFileSync(resolve(root, "shared/series-manifest.json"), "utf8"));
} catch (error) {
  fail(`シリーズ公開設定を読み込めません: ${error.message}`);
  manifest = { series: {} };
}
if (manifest?.schemaVersion !== 1) fail("シリーズ公開設定のschemaVersionが1ではありません");
for (const audience of Object.keys(expected)) {
  const release = manifest?.series?.[audience];
  if (release?.status !== "published" || release?.questionFile !== `${audience}.json`) {
    fail(`${audience}: 既存シリーズの公開状態または質問JSONパスが不正です`);
  }
}
if (Object.keys(manifest?.series || {}).length !== 5) fail("公開マニフェストは5シリーズを管理する必要があります");

for (const audience of newSeries) {
  const path = resolve(root, `shared/questions/${audience}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${audience}: JSONを読み込めません: ${error.message}`);
    continue;
  }

  const release = manifest?.series?.[audience];
  if (!release || !["published", "unpublished"].includes(release.status)) fail(`${audience}: 公開マニフェストの状態が不正です`);
  if (release?.questionFile !== `${audience}.json`) fail(`${audience}: 公開マニフェストのJSONパスが不正です`);
  if (!data || Array.isArray(data) || typeof data !== "object") {
    fail(`${audience}: 新シリーズJSONはオブジェクト形式にしてください`);
    continue;
  }
  if (data.schemaVersion !== 1) fail(`${audience}: schemaVersion が1ではありません`);
  if (data.series !== audience) fail(`${audience}: series が一致しません`);
  if (data.publicationStatus !== release?.status) fail(`${audience}: データとマニフェストの公開状態が一致しません`);
  if (!Array.isArray(data.questions)) {
    fail(`${audience}: questions が配列ではありません`);
    continue;
  }
  if (release?.status === "unpublished" && release.developmentPreview !== true) fail(`${audience}: 未公開シリーズは開発プレビュー設定を明示してください`);
  if (release?.status === "published" && data.questions.length === 0) fail(`${audience}: 空の質問データを公開できません`);

  const ids = new Set();
  const texts = new Map();
  const pools = new Map();
  const candidateQuestions = data.questions.filter((question) => question && typeof question.text === "string");
  data.questions.forEach((question, index) => {
    const where = `${audience}[${index}]`;
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      fail(`${where}: 質問がオブジェクトではありません`);
      return;
    }
    if (typeof question.id !== "string" || !question.id.trim()) fail(`${where}: IDが空です`);
    else if (ids.has(question.id)) fail(`${where}: ID重複 ${question.id}`);
    else ids.add(question.id);
    if (question.series !== audience) fail(`${where}: series が一致しません`);
    if (typeof question.category !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(question.category)) fail(`${where}: category が不正です`);
    if (!Number.isInteger(question.level) || question.level < 1 || question.level > 4) fail(`${where}: Level が不正です`);
    if (!["lite", "deep"].includes(question.intensity)) fail(`${where}: intensity が不正です`);
    if (typeof question.text !== "string" || !question.text.trim()) fail(`${where}: text が空です`);
    else if (question.text.length > MAX_RELEASE_TEXT_LENGTH) fail(`${where}: text が長すぎます`);
    if (typeof question.followUp !== "string" || !question.followUp.trim()) fail(`${where}: followUp が空です`);
    else if (question.followUp.length > MAX_RELEASE_TEXT_LENGTH) fail(`${where}: followUp が長すぎます`);
    if (!Number.isInteger(question.sensitivity) || question.sensitivity < 0 || question.sensitivity > 3) fail(`${where}: sensitivity が不正です`);
    if (!Array.isArray(question.contentNotes) || question.contentNotes.some((tag) => typeof tag !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(tag))) fail(`${where}: contentNotes が不正です`);
    if (question.reviewStatus !== "pending" && question.reviewStatus !== "approved") fail(`${where}: reviewStatus が不正です`);
    if (!question.source || question.source.kind !== "grok" || question.source.model !== "Grok" || question.source.stage !== "ai-initial-draft" || !/^\d{4}-\d{2}-\d{2}$/.test(question.source.generatedAt || "")) fail(`${where}: Grok初期案の出典メタデータが不正です`);
    if (release?.status === "published" && question.reviewStatus !== "approved") fail(`${where}: レビュー待ちの質問は公開できません`);
    if (typeof question.id === "string" && typeof question.category === "string" && Number.isInteger(question.level) && ["lite", "deep"].includes(question.intensity)) {
      const idPattern = new RegExp(`^${audience}-${question.category}-${question.intensity}-l${question.level}-\\d{3}$`);
      if (!idPattern.test(question.id)) fail(`${where}: ID形式が不正です`);
    }
    if (typeof question.text === "string") {
      const normalizedText = normalizeQuestionText(question.text);
      if (texts.has(normalizedText)) fail(`${where}: 質問文が ${texts.get(normalizedText)} と重複しています`);
      else if (normalizedText) texts.set(normalizedText, question.id || where);
      if (Number.isInteger(question.level) && ["lite", "deep"].includes(question.intensity)) {
        const poolKey = `${question.intensity}:${question.level}`;
        pools.set(poolKey, (pools.get(poolKey) || 0) + 1);
      }
      records.push({ ...question, audience });
    }
  });
  if (release?.status === "published") {
    for (const intensity of ["lite", "deep"]) {
      for (const level of [1, 2, 3, 4]) {
        if ((pools.get(`${intensity}:${level}`) || 0) < 3) fail(`${audience}: 公開には${intensity} / Level ${level}に最低3問が必要です`);
      }
    }
  }
  for (let index = 0; index < candidateQuestions.length; index += 1) {
    const question = candidateQuestions[index];
    const comparisons = [
      ...candidateQuestions.slice(index + 1),
      ...records.filter((record) => record.audience !== audience && typeof record.text === "string"),
    ];
    for (const other of comparisons) {
      if (normalizeQuestionText(question.text) === normalizeQuestionText(other.text)) continue;
      if (question.text.trim().length < 18 || other.text.trim().length < 18) continue;
      if (textSimilarity(question.text, other.text) >= 0.76) fail(`${audience}/${question.id || "質問"}: 類似質問 ${other.id || other.audience} を検出しました`);
    }
  }
  console.log(`${audience}: ${data.questions.length}問 / ${release?.status || "状態不明"}`);
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
console.log("結果: PASS — 5シリーズのデータ契約と公開ゲートに適合しています。");
