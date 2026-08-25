#!/usr/bin/env node
/**
 * Omoi for 全シリーズの公開用JSONを検証するスモーク監査。
 * Couplesの正本一致は verify-couples-dataset.mjs が担当し、
 * このスクリプトは3シリーズ共通の公開データ契約を確認する。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const expected = {
  couples: { total: 701, sourceCounts: { loves: 700, editorial: 1 } },
  family: { total: 80, sourceCounts: { editorial: 80 } },
  friends: { total: 80, sourceCounts: { editorial: 80 } },
};
const failures = [];
const forbiddenTexts = ["なぎささん大好きだよ！"];

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
  const levels = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sources = {};
  data.forEach((card, index) => {
    if (ids.has(card.id)) fail(`${audience}[${index}]: ID重複 ${card.id}`);
    ids.add(card.id);
    if (card.audience !== audience) fail(`${audience}[${index}]: audience=${card.audience}`);
    if (!Number.isInteger(card.level) || card.level < 1 || card.level > 4) fail(`${audience}[${index}]: level不正`);
    else levels[card.level] += 1;
    if (typeof card.text !== "string" || card.text.trim() === "") fail(`${audience}[${index}]: textが空`);
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

if (failures.length) {
  console.error(`結果: FAIL — ${failures.length}件`);
  process.exit(1);
}
console.log("結果: PASS — 3シリーズの公開データ契約に適合しています。");
