#!/usr/bin/env node
/**
 * migrate-loves-couples.mjs
 *
 * Loves(手書き静的カード 701 問)を Omoi for Couples の質問データ
 * (shared/questions/couples.json)へ変換する恒久移行スクリプト。
 *
 * 正本ソース: tools/PROVENANCE.md を参照。
 *   commit : d98a9c2346c66f9bbc90a7a1eff636f88795cc86 (Loveds_publish)
 *   path   : Loveds/web/src/data/cards.ts
 *   blob   : 61d01bd7021f19f5bea6f950bd0a428d491e69a3
 *   sha256 : 8157d9f273edf58dd011db8627c16dd110a49d81e76577672502dc4cd47bfc57
 *
 * verbatim の定義:
 *   TypeScript ソースと JSON の構文一致ではなく、
 *   文字列リテラルをデコードした**ランタイム上の値**(質問文・id・level・category)の一致。
 *
 * 使い方:
 *   node tools/migrate-loves-couples.mjs <cards.ts へのパス>
 *
 * 出力: shared/questions/couples.json
 *   - Level / text / id / category は元データのまま凍結(1問も移動・改変しない)
 *   - テンプレート生成カードは対象外
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CANONICAL_SHA256 = "8157d9f273edf58dd011db8627c16dd110a49d81e76577672502dc4cd47bfc57";
const CANONICAL_COMMIT = "d98a9c2346c66f9bbc90a7a1eff636f88795cc86";
const CANONICAL_PATH = "Loveds/web/src/data/cards.ts";
const EXPECTED_TOTAL = 701;
const EXPECTED_PER_LEVEL = { 1: 167, 2: 169, 3: 167, 4: 198 };

const toolsDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(toolsDir, "../shared/questions/couples.json");

const inputArg = process.argv[2];
if (!inputArg) {
  console.error("使い方: node tools/migrate-loves-couples.mjs <cards.ts へのパス>");
  process.exit(1);
}
const inputPath = resolve(inputArg);

// ---- 1. 入力の SHA-256 照合 -------------------------------------------------

const sourceText = readFileSync(inputPath, "utf8");
const actualSha256 = createHash("sha256").update(sourceText, "utf8").digest("hex");
console.log(`入力: ${inputPath}`);
console.log(`SHA-256: ${actualSha256}`);
if (actualSha256 !== CANONICAL_SHA256) {
  console.error(`\n[中断] 入力ファイルがカノニカル blob と一致しません。`);
  console.error(`  期待: ${CANONICAL_SHA256} (commit ${CANONICAL_COMMIT}, ${CANONICAL_PATH})`);
  console.error(`  実際: ${actualSha256}`);
  console.error(`tools/PROVENANCE.md を確認し、正しいソースを指定してください。`);
  process.exit(1);
}
console.log(`カノニカル blob (commit ${CANONICAL_COMMIT.slice(0, 7)}) と一致しました。\n`);

// ---- 2. 静的カードブロックの抽出 -------------------------------------------

const START_MARKER = "export const cards: QuestionCard[] = [";
const END_MARKER = "// Generated from iOS supplemental question templates.";

const startIndex = sourceText.indexOf(START_MARKER);
const endIndex = sourceText.indexOf(END_MARKER);
if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  console.error("[中断] cards.ts 内に静的カードブロックの境界マーカーが見つかりません。");
  process.exit(1);
}
const staticBlock = sourceText.slice(startIndex + START_MARKER.length, endIndex);

// エスケープを考慮したダブルクォート文字列リテラルにマッチするパターン
const STRING = String.raw`"((?:[^"\\]|\\.)*)"`;
const CARD_PATTERN = new RegExp(
  `\\{\\s*id:\\s*${STRING},\\s*category:\\s*${STRING},\\s*level:\\s*(\\d),\\s*text:\\s*${STRING}\\s*,?\\s*\\}`,
  "g",
);

/** TS のダブルクォート文字列リテラルの中身をデコードしてランタイム値へ */
function decodeTsString(rawBody) {
  return JSON.parse(`"${rawBody}"`);
}

const cards = [];
for (const match of staticBlock.matchAll(CARD_PATTERN)) {
  const [, idRaw, categoryRaw, levelRaw, textRaw] = match;
  let card;
  try {
    card = {
      id: decodeTsString(idRaw),
      category: decodeTsString(categoryRaw),
      level: Number(levelRaw),
      text: decodeTsString(textRaw),
    };
  } catch (error) {
    console.error(`[中断] 文字列デコード失敗 (${idRaw}): ${error.message}`);
    process.exit(1);
  }
  cards.push(card);
}

console.log(`抽出された手書きカード: ${cards.length} 問 (期待値: ${EXPECTED_TOTAL})`);
if (cards.length !== EXPECTED_TOTAL) {
  console.error("[中断] 抽出件数が期待値と一致しません。正規表現またはソースを確認してください。");
  process.exit(1);
}

const perLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const card of cards) perLevel[card.level] += 1;
for (const level of [1, 2, 3, 4]) {
  const ok = perLevel[level] === EXPECTED_PER_LEVEL[String(level)];
  console.log(`  Level ${level}: ${perLevel[level]} 問${ok ? "" : ` (期待値 ${EXPECTED_PER_LEVEL[String(level)]} — 不一致!)`}`);
  if (!ok) process.exit(1);
}

// ---- 3. Omoi for Couples 形式へ正規化 --------------------------------------
// 契約フィールド: id / audience / level / text (+category)
// - id       : Loves 元 ID をそのまま採用(トレーサビリティ)
// - level    : 元 Level を凍結(表示名のみ別途 ForSeriesLevel として定義)
// - text     : デコード済みランタイム値を逐語出力(改変禁止)
// - category : 元カテゴリキー(表示ラベルは app.js 側で復元)

const migrated = cards.map((card) => ({
  id: card.id,
  audience: "couples",
  level: card.level,
  text: card.text,
  category: card.category,
  source: "loves",
}));

writeFileSync(outputPath, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");
console.log(`\n出力: ${outputPath} (${migrated.length} 問)`);
console.log("完了。次に tools/verify-couples-dataset.mjs で検証してください。");
