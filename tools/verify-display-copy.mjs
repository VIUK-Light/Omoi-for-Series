import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertDisplayCopy } from "../shared/display-copy.mjs";
import { seriesFitIssues } from "./series-fit-rules.mjs";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const seriesIds = ["couples", "family", "friends", "adults", "self-care"];
const read = (path) => JSON.parse(readFileSync(resolve(projectRoot, path), "utf8"));
const normalized = (text) => text.normalize("NFKC").replace(/[\s\p{P}\p{S}]+/gu, "");

export function readDisplaySources(series) {
  const questionData = read(`shared/questions/${series}.json`);
  const legacy = Array.isArray(questionData);
  return {
    questionData,
    questions: legacy ? questionData : questionData.questions,
    followUpData: legacy ? read(`shared/followups/${series}.json`) : null,
    display: read(`shared/display-copy/${series}.json`),
  };
}

export function validateDisplaySources(series, { questions, followUpData, display }) {
  const entries = assertDisplayCopy(display, series, questions);
  const issues = [];
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  for (const [id, entry] of Object.entries(entries)) {
    const question = questionsById.get(id);
    const followUp = followUpData ? followUpData.questions[id] : question.followUp;
    const hash = createHash("sha256").update(JSON.stringify([question.text, followUp])).digest("hex");
    if (entry.sourceSha256 !== hash) issues.push(`${series}/${id}: 原文ハッシュが一致しません。`);
    if (entry.text) {
      const text = entry.text.mobile.replaceAll("\n", "");
      for (const issue of seriesFitIssues({ ...question, text }, series)) issues.push(`${series}/${id}: ${issue}`);
    }
  }
  // Compare effective text so a rewrite cannot duplicate an untouched question.
  for (const field of ["text", "followUp"]) {
    const seen = new Map();
    for (const question of questions) {
      const original = field === "text" ? question.text : followUpData?.questions[question.id] ?? question.followUp;
      const text = entries[question.id]?.[field]?.mobile ?? original;
      if (typeof text !== "string") continue;
      const key = normalized(text);
      if (seen.has(key) && (entries[question.id]?.[field] || entries[seen.get(key)]?.[field])) {
        issues.push(`${series}/${question.id}: ${field} が ${seen.get(key)} と重複しています。`);
      }
      seen.set(key, question.id);
    }
  }
  return { issues, entries, count: Object.values(entries).reduce((sum, entry) => sum + Number(!!entry.text) + Number(!!entry.followUp), 0) };
}

export function verifyDisplayCopies() {
  let count = 0;
  for (const series of seriesIds) {
    const report = validateDisplaySources(series, readDisplaySources(series));
    if (report.issues.length) throw new Error(report.issues.join("\n"));
    count += report.count;
    console.log(`${series}: ${report.count}表示 / 原文ハッシュ・PC/スマホの語句・重複 PASS`);
  }
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(`PASS: ${verifyDisplayCopies()}表示`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
