#!/usr/bin/env node
/**
 * verify-couples-dataset.mjs
 *
 * shared/questions/couples.json が Loves 正本ソースと
 * リリースキュレーション契約に従っているかを独立検証する恒久監査スクリプト。
 *
 * 検証項目:
 *   0. 入力 cards.ts の SHA-256 がカノニカル blob と一致(tools/PROVENANCE.md)
 *   1. 抽出件数 = 701 / レベル別件数(L1=167, L2=169, L3=167, L4=198)
 *   2. Loves 700問の順序を含めたデコード済み値一致 + 編集置換1問の一致
 *   3. 個人的な固定文言が残っていないこと
 *   4. ID の一意性
 *   5. スキーマ準拠(キー集合・audience・level 範囲・source)・テキスト非空
 *
 * 使い方:
 *   node tools/verify-couples-dataset.mjs <cards.ts へのパス> [couples.json へのパス]
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CANONICAL_SHA256 = "8157d9f273edf58dd011db8627c16dd110a49d81e76577672502dc4cd47bfc57";
const CANONICAL_COMMIT = "d98a9c2346c66f9bbc90a7a1eff636f88795cc86";
const CANONICAL_PATH = "Loveds/web/src/data/cards.ts";
const EXPECTED_TOTAL = 701;
const EXPECTED_PER_LEVEL = { 1: 167, 2: 169, 3: 167, 4: 198 };
const RELEASE_EXCLUDED_IDS = new Set(["love-1-3"]);
const RELEASE_REPLACEMENTS = new Map([
  ["love-1-3", {
    id: "editorial-couples-1-1",
    audience: "couples",
    level: 1,
    text: "好きな人には、言葉で気持ちを伝えたい？態度で伝われば十分？",
    category: "romance",
    source: "editorial",
  }],
]);
const FORBIDDEN_TEXTS = ["なぎささん大好きだよ！"];
const ALLOWED_KEYS = new Set(["id", "audience", "level", "text", "category", "source"]);
const ALLOWED_SOURCES = new Set(["loves", "editorial"]);

const toolsDir = dirname(fileURLToPath(import.meta.url));
const sourceArg = process.argv[2];
const jsonArg = process.argv[3] ?? resolve(toolsDir, "../shared/questions/couples.json");
if (!sourceArg) {
  console.error("使い方: node tools/verify-couples-dataset.mjs <cards.ts へのパス> [couples.json へのパス]");
  process.exit(1);
}

let failures = 0;
function fail(message) {
  failures += 1;
  console.error(`  ✗ ${message}`);
}
function pass(message) {
  console.log(`  ✓ ${message}`);
}

// ---- ソース側抽出(migrate スクリプトと同一ロジックで再導出) -----------------

const sourceText = readFileSync(resolve(sourceArg), "utf8");
const actualSha256 = createHash("sha256").update(sourceText, "utf8").digest("hex");

console.log("[0] 入力ソースの正本性");
if (actualSha256 === CANONICAL_SHA256) {
  pass(`SHA-256 がカノニカル blob と一致 (commit ${CANONICAL_COMMIT.slice(0, 7)})`);
} else {
  fail(`SHA-256 不一致: 期待 ${CANONICAL_SHA256} / 実際 ${actualSha256}`);
}

const START_MARKER = "export const cards: QuestionCard[] = [";
const END_MARKER = "// Generated from iOS supplemental question templates.";
const startIndex = sourceText.indexOf(START_MARKER);
const endIndex = sourceText.indexOf(END_MARKER);
const STRING = String.raw`"((?:[^"\\]|\\.)*)"`;
const CARD_PATTERN = new RegExp(
  `\\{\\s*id:\\s*${STRING},\\s*category:\\s*${STRING},\\s*level:\\s*(\\d),\\s*text:\\s*${STRING}\\s*,?\\s*\\}`,
  "g",
);

function decodeTsString(rawBody) {
  return JSON.parse(`"${rawBody}"`);
}

const sourceCards = [];
if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  const staticBlock = sourceText.slice(startIndex + START_MARKER.length, endIndex);
  for (const match of staticBlock.matchAll(CARD_PATTERN)) {
    const [, idRaw, categoryRaw, levelRaw, textRaw] = match;
    try {
      sourceCards.push({
        id: decodeTsString(idRaw),
        category: decodeTsString(categoryRaw),
        level: Number(levelRaw),
        text: decodeTsString(textRaw),
      });
    } catch (error) {
      fail(`文字列デコード失敗 (${idRaw}): ${error.message}`);
    }
  }
} else {
  fail("静的カードブロックの境界マーカーが見つかりません");
}

console.log("\n[1] 件数");
if (sourceCards.length === EXPECTED_TOTAL) pass(`ソース抽出 ${sourceCards.length} 問`);
else fail(`ソース抽出 ${sourceCards.length} 問 (期待 ${EXPECTED_TOTAL})`);

const perLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const card of sourceCards) perLevel[card.level] += 1;
for (const level of [1, 2, 3, 4]) {
  if (perLevel[level] === EXPECTED_PER_LEVEL[String(level)]) pass(`Level ${level}: ${perLevel[level]} 問`);
  else fail(`Level ${level}: ${perLevel[level]} 問 (期待 ${EXPECTED_PER_LEVEL[String(level)]})`);
}

// ---- JSON 側の検証 ----------------------------------------------------------

const migrated = JSON.parse(readFileSync(resolve(jsonArg), "utf8"));

console.log("\n[2] リリースデータ一致(順序含む・デコード済み値比較)");
if (!Array.isArray(migrated)) {
  fail("couples.json が配列ではありません");
} else {
  if (migrated.length === EXPECTED_TOTAL) pass(`リリース件数一致: ${migrated.length}`);
  else fail(`リリース件数不一致: JSON ${migrated.length} / 期待 ${EXPECTED_TOTAL}`);

  const expectedRelease = sourceCards
    .filter((card) => !RELEASE_EXCLUDED_IDS.has(card.id))
    .map((card) => ({
      id: card.id,
      audience: "couples",
      level: card.level,
      text: card.text,
      category: card.category,
      source: "loves",
    }));
  for (const [excludedId, replacement] of RELEASE_REPLACEMENTS) {
    const insertionIndex = sourceCards.findIndex((card) => card.id === excludedId);
    if (insertionIndex === -1) {
      fail(`置換対象が正本ソースにありません: ${excludedId}`);
    } else {
      expectedRelease.splice(insertionIndex, 0, replacement);
    }
  }

  let mismatchCount = 0;
  const maxReports = 10;
  for (let index = 0; index < Math.max(migrated.length, expectedRelease.length); index += 1) {
    const jsonCard = migrated[index];
    const expectedCard = expectedRelease[index];
    if (!jsonCard || !expectedCard) {
      mismatchCount += 1;
      if (mismatchCount <= maxReports) fail(`index ${index}: 片方のみ存在`);
      continue;
    }
    for (const field of ["id", "audience", "level", "text", "category", "source"]) {
      if (jsonCard[field] !== expectedCard[field]) {
        mismatchCount += 1;
        if (mismatchCount <= maxReports) {
          fail(`index ${index} (${expectedCard.id}) の ${field} が不一致:\n      期待: ${JSON.stringify(String(expectedCard[field]).slice(0, 80))}\n      JSON  : ${JSON.stringify(String(jsonCard[field]).slice(0, 80))}`);
        }
      }
    }
  }
  if (mismatchCount === 0) pass("Loves 700問 + 編集置換1問が順序含め一致");
  else fail(`不一致項目数: ${mismatchCount}(表示は先頭 ${maxReports} 件)`);
}

console.log("\n[3] 個人的な固定文言の除去");
{
  const forbiddenMatches = migrated.filter((card) => FORBIDDEN_TEXTS.includes(card.text));
  if (forbiddenMatches.length === 0) pass("公開データに個人的な固定文言なし");
  else {
    for (const card of forbiddenMatches.slice(0, 5)) fail(`禁止文言: ${card.id}`);
    fail(`禁止文言の残存数: ${forbiddenMatches.length}`);
  }
}

console.log("\n[4] ID の一意性");
{
  const seen = new Set();
  let duplicates = 0;
  for (const card of migrated) {
    if (seen.has(card.id)) {
      duplicates += 1;
      if (duplicates <= 5) fail(`重複 ID: ${card.id}`);
    }
    seen.add(card.id);
  }
  if (duplicates === 0) pass(`一意な ID が ${seen.size} 件(重複なし)`);
  else fail(`重複 ID 合計: ${duplicates}`);
}

console.log("\n[5] スキーマ準拠");
{
  let schemaErrors = 0;
  migrated.forEach((card, index) => {
    const keys = Object.keys(card);
    const unknownKeys = keys.filter((key) => !ALLOWED_KEYS.has(key));
    const missingKeys = [...ALLOWED_KEYS].filter((key) => !(key in card));
    if (unknownKeys.length || missingKeys.length) {
      schemaErrors += 1;
      if (schemaErrors <= 5) fail(`index ${index} (${card.id}): キー不正 unknown=[${unknownKeys}] missing=[${missingKeys}]`);
    }
    if (card.audience !== "couples") {
      schemaErrors += 1;
      if (schemaErrors <= 5) fail(`index ${index} (${card.id}): audience=${JSON.stringify(card.audience)}`);
    }
    if (!Number.isInteger(card.level) || card.level < 1 || card.level > 4) {
      schemaErrors += 1;
      if (schemaErrors <= 5) fail(`index ${index} (${card.id}): level=${JSON.stringify(card.level)}`);
    }
    if (!ALLOWED_SOURCES.has(card.source)) {
      schemaErrors += 1;
      if (schemaErrors <= 5) fail(`index ${index} (${card.id}): source=${JSON.stringify(card.source)}`);
    }
    if (typeof card.text !== "string" || card.text.trim() === "") {
      schemaErrors += 1;
      if (schemaErrors <= 5) fail(`index ${index} (${card.id}): text が空または文字列以外`);
    }
  });
  if (schemaErrors === 0) pass("キー集合 / audience / level / source / text 非空 — 全問適合");
  else fail(`スキーマ違反合計: ${schemaErrors}`);
}

// ---- 総合判定 ---------------------------------------------------------------

console.log("");
if (failures === 0) {
  console.log("結果: PASS — couples.json は正本700問 + 編集置換1問のリリース契約に適合しています。");
  process.exit(0);
} else {
  console.log(`結果: FAIL — ${failures} 件の問題を検出しました。`);
  process.exit(1);
}
