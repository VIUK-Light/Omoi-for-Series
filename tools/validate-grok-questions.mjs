#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hasValidAiSource } from "../shared/content-policy.mjs";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const seriesFiles = {
  adults: "adults.json",
  "self-care": "self-care.json",
};
const forbiddenPatterns = [
  /(?:強要|無理にさせる|断れないように|必ず答え(?:て|る)|断ることを許さない)/u,
  /(?:性器|挿入|オーガズム|自慰|具体的な性行為の手順)/u,
  /(?:未成年|中学生|高校生).{0,12}(?:性的|性行為|セックス)|(?:性的|性行為|セックス).{0,12}(?:未成年|中学生|高校生)/u,
];

export function hasUnsafeQuestionText(text) {
  return forbiddenPatterns.some(pattern => pattern.test(String(text)));
}

export function normalizeQuestionText(value) {
  return String(value).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function trigrams(value) {
  const characters = [...normalizeQuestionText(value)];
  if (characters.length < 3) return new Set(characters);
  const result = new Set();
  for (let index = 0; index <= characters.length - 3; index += 1) {
    result.add(characters.slice(index, index + 3).join(""));
  }
  return result;
}

export function textSimilarity(left, right) {
  const leftParts = trigrams(left);
  const rightParts = trigrams(right);
  if (!leftParts.size || !rightParts.size) return 0;
  let intersection = 0;
  for (const part of leftParts) if (rightParts.has(part)) intersection += 1;
  return intersection / (leftParts.size + rightParts.size - intersection);
}

function addIssue(issues, severity, message) {
  issues.push({ severity, message });
}

function allPublishedQuestions() {
  const result = [];
  for (const file of ["couples.json", "family.json", "friends.json"]) {
    try {
      const data = JSON.parse(readFileSync(resolve(root, "shared/questions", file), "utf8"));
      if (Array.isArray(data)) result.push(...data.map((question) => ({ ...question, _file: file })));
    } catch {
      // The main three-series verifier reports missing or malformed legacy files.
    }
  }
  return result;
}

function makeComparableQuestions(data, legacyQuestions) {
  const source = Array.isArray(data?.questions) ? data.questions : [];
  return [
    ...source.map((question) => ({ ...question, _source: "candidate" })),
    ...legacyQuestions.map((question) => ({ ...question, _source: question._file || "legacy" })),
  ];
}

export function validateDataset(data, { series, legacyQuestions = [], requireReleaseReady = false } = {}) {
  const issues = [];
  if (!Object.hasOwn(seriesFiles, series)) {
    addIssue(issues, "error", `対象シリーズが不正です: ${series}`);
    return { issues, readyForRelease: false, questionCount: 0 };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    addIssue(issues, "error", "JSONのルートはオブジェクトにしてください。");
    return { issues, readyForRelease: false, questionCount: 0 };
  }
  if (data.schemaVersion !== 1) addIssue(issues, "error", "schemaVersion は 1 である必要があります。");
  if (data.series !== series) addIssue(issues, "error", `series は ${series} である必要があります。`);
  const acceptedStates = requireReleaseReady ? ["unpublished", "published"] : ["unpublished"];
  if (!acceptedStates.includes(data.publicationStatus)) addIssue(issues, "error", "AI初期案の取り込みデータは publicationStatus=unpublished にしてください。");
  if (!Array.isArray(data.questions)) {
    addIssue(issues, "error", "questions は配列にしてください。");
    return { issues, readyForRelease: false, questionCount: 0 };
  }
  if (data.questions.length === 0) addIssue(issues, "info", "質問はまだありません。空のシリーズとして未公開状態を維持します。");

  const ids = new Set();
  const textOwners = new Map();
  const followUpOwners = new Map();
  const legacyTextOwners = new Map();
  const poolCounts = new Map();
  const validCategories = /^[a-z][a-z0-9-]{1,39}$/;
  for (const question of legacyQuestions) {
    const normalized = normalizeQuestionText(question.text || "");
    if (normalized && !legacyTextOwners.has(normalized)) legacyTextOwners.set(normalized, question.id || "既存シリーズ");
  }

  data.questions.forEach((question, index) => {
    const where = `${series}.questions[${index}]`;
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      addIssue(issues, "error", `${where}: 質問はオブジェクトにしてください。`);
      return;
    }
    if (typeof question.id !== "string" || !question.id.trim()) addIssue(issues, "error", `${where}: id がありません。`);
    else if (ids.has(question.id)) addIssue(issues, "error", `${where}: IDが重複しています (${question.id})。`);
    else ids.add(question.id);
    if (typeof question.id === "string" && typeof question.category === "string" && Number.isInteger(question.level) && ["lite", "deep"].includes(question.intensity)) {
      const idPattern = new RegExp(`^${series}-${question.category}-${question.intensity}-l${question.level}-\\d{3}$`);
      if (!idPattern.test(question.id)) addIssue(issues, "error", `${where}: id は series-category-intensity-lLEVEL-3桁連番の形式にしてください。`);
    }
    if (question.series !== series) addIssue(issues, "error", `${where}: series がルートと一致しません。`);
    if (typeof question.category !== "string" || !validCategories.test(question.category)) addIssue(issues, "error", `${where}: category は英小文字スラッグにしてください。`);
    if (!Number.isInteger(question.level) || question.level < 1 || question.level > 4) addIssue(issues, "error", `${where}: level は1〜4の整数にしてください。`);
    if (!["lite", "deep"].includes(question.intensity)) addIssue(issues, "error", `${where}: intensity は lite または deep にしてください。`);
    if (typeof question.text !== "string" || !question.text.trim()) addIssue(issues, "error", `${where}: text が空です。`);
    else if (question.text.trim().length > 160) addIssue(issues, "error", `${where}: text は160文字以内にしてください。`);
    if (typeof question.followUp !== "string" || !question.followUp.trim()) addIssue(issues, "error", `${where}: followUp が空です。`);
    else if (question.followUp.trim().length > 160) addIssue(issues, "error", `${where}: followUp は160文字以内にしてください。`);
    if (!Number.isInteger(question.sensitivity) || question.sensitivity < 0 || question.sensitivity > 3) addIssue(issues, "error", `${where}: sensitivity は0〜3の整数にしてください。`);
    if (!Array.isArray(question.contentNotes) || question.contentNotes.some((tag) => typeof tag !== "string" || !validCategories.test(tag))) addIssue(issues, "error", `${where}: contentNotes は英小文字スラッグの配列にしてください。`);
    if (question.reviewStatus !== "pending" && question.reviewStatus !== "approved") addIssue(issues, "error", `${where}: reviewStatus は pending または approved にしてください。`);
    if (!hasValidAiSource(question.source)) {
      addIssue(issues, "error", `${where}: AI初期案のsourceメタデータが不正です（Grok/Codexの実際の作成元を指定）。`);
    }

    const texts = [question.text, question.followUp].filter((text) => typeof text === "string");
    for (const text of texts) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(text)) addIssue(issues, "error", `${where}: 圧力・露骨な性表現・未成年に関する禁止表現を検出しました。人が確認してください。`);
      }
    }

    if (Number.isInteger(question.level) && ["lite", "deep"].includes(question.intensity)) {
      const key = `${question.intensity}:${question.level}`;
      poolCounts.set(key, (poolCounts.get(key) || 0) + 1);
    }

    const followUpKey = normalizeQuestionText(question.followUp || "");
    if (followUpKey) {
      if (followUpOwners.has(followUpKey)) addIssue(issues, "error", `${where}: 深掘り質問が ${followUpOwners.get(followUpKey)} と重複しています。`);
      else followUpOwners.set(followUpKey, question.id || where);
      if (followUpKey === normalizeQuestionText(question.text || "")) addIssue(issues, "error", `${where}: メイン質問と深掘り質問が同じです。`);
    }

    const normalized = normalizeQuestionText(question.text || "");
    if (normalized) {
      const first = textOwners.get(normalized);
      if (first) addIssue(issues, "error", `${where}: 質問文が ${first} と重複しています。`);
      const legacyOwner = legacyTextOwners.get(normalized);
      if (legacyOwner) addIssue(issues, "error", `${where}: 既存シリーズの質問 ${legacyOwner} と重複しています。`);
      else textOwners.set(normalized, question.id || where);
    }
  });

  const candidates = makeComparableQuestions(data, legacyQuestions)
    .filter((question) => question._source === "candidate" && typeof question.text === "string" && question.text.trim());
  const comparisonPool = makeComparableQuestions({ questions: [] }, legacyQuestions);
  const nearDuplicatePairs = new Set();
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const comparisons = [
      ...candidates.slice(index + 1),
      ...comparisonPool,
    ];
    for (const other of comparisons) {
      if (normalizeQuestionText(candidate.text) === normalizeQuestionText(other.text)) continue;
      if (candidate.text.trim().length < 18 || typeof other.text !== "string" || other.text.trim().length < 18) continue;
      const similarity = textSimilarity(candidate.text, other.text);
      if (similarity >= 0.76) {
        const pair = [candidate.id || "candidate", other.id || other._source || "legacy"].sort().join(" / ");
        if (nearDuplicatePairs.has(pair)) continue;
        nearDuplicatePairs.add(pair);
        addIssue(issues, "error", `${candidate.id || "質問"}: 類似度の高い質問 ${other.id || other._source} を検出しました (Jaccard ${similarity.toFixed(2)})。`);
      }
    }
  }

  const approvalIssues = [];
  if (!data.questions.length) approvalIssues.push("質問データが空です。");
  for (const question of data.questions) {
    if (question?.reviewStatus !== "approved") approvalIssues.push(`${question?.id || "IDなし"} は人のレビュー待ちです。`);
  }
  for (const intensity of ["lite", "deep"]) {
    for (const level of [1, 2, 3, 4]) {
      const count = poolCounts.get(`${intensity}:${level}`) || 0;
      if (count < 3) approvalIssues.push(`${intensity} / Level ${level} は ${count} 問です（最低3問が必要）。`);
    }
  }
  const readyForRelease = approvalIssues.length === 0 && !issues.some((issue) => issue.severity === "error");
  if (!readyForRelease) {
    addIssue(issues, requireReleaseReady ? "error" : "info", `公開準備は未完了: ${approvalIssues.slice(0, 5).join(" ")}${approvalIssues.length > 5 ? " …" : ""}`);
  }

  return { issues, readyForRelease, questionCount: data.questions.length };
}

function parseArgs(args) {
  const options = { series: "", input: "", importToSeries: false, requireReleaseReady: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--series") options.series = args[++index] || "";
    else if (args[index] === "--input") options.input = args[++index] || "";
    else if (args[index] === "--import") options.importToSeries = true;
    else if (args[index] === "--release-ready") options.requireReleaseReady = true;
    else if (args[index] === "--help" || args[index] === "-h") options.help = true;
    else throw new Error(`不明な引数です: ${args[index]}`);
  }
  return options;
}

function printHelp() {
  console.log(`使い方: node tools/validate-grok-questions.mjs --series adults|self-care [--input FILE] [--import] [--release-ready]

  検証のみ:        --input にAI出力JSON（Grok/Codex）を指定
  未公開で取り込む: --input FILE --import
  公開審査の準備確認: --input FILE --release-ready

--import は構造検証に通り、対象データファイルが空のときだけ取り込みます。
このコマンドは公開状態を変更せず、AI質問を承認済みにもしません。`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  if (!Object.hasOwn(seriesFiles, options.series)) throw new Error("--series に adults または self-care を指定してください。");
  const targetPath = resolve(root, "shared/questions", seriesFiles[options.series]);
  const inputPath = options.input ? resolve(options.input) : targetPath;
  let data;
  try {
    data = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (error) {
    throw new Error(`JSONを読み込めません: ${error.message}`);
  }
  const report = validateDataset(data, {
    series: options.series,
    legacyQuestions: allPublishedQuestions(),
    requireReleaseReady: options.requireReleaseReady,
  });
  const errors = report.issues.filter((issue) => issue.severity === "error");
  for (const issue of report.issues) {
    const marker = issue.severity === "error" ? "✗" : issue.severity === "info" ? "·" : "!";
    console.log(`  ${marker} ${issue.message}`);
  }
  console.log(`${options.series}: ${report.questionCount}問 / ${report.readyForRelease ? "公開審査の準備完了" : "未公開のまま"}`);

  if (options.importToSeries && !errors.length) {
    const current = JSON.parse(readFileSync(targetPath, "utf8"));
    if (Array.isArray(current) || !Array.isArray(current.questions) || current.questions.length > 0 || current.publicationStatus !== "unpublished") {
      throw new Error("取り込み先が空の未公開ファイルではないため、既存データ保護のため取り込みを中止しました。");
    }
    if (!data.questions.length) throw new Error("空の質問配列は取り込めません。");
    writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`未公開データとして取り込みました: ${targetPath}`);
  }

  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`検証エラー: ${error.message}`);
    process.exitCode = 1;
  });
}
