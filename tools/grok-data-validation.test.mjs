import test from "node:test";
import assert from "node:assert/strict";
import { validateDataset, textSimilarity } from "./validate-grok-questions.mjs";

function draftQuestion({ id = "adults-communication-lite-l1-001", text = "ここに質問文", followUp = "ここに深掘り質問", level = 1, intensity = "lite", reviewStatus = "pending" } = {}) {
  return {
    id,
    series: "adults",
    category: "communication",
    level,
    intensity,
    text,
    followUp,
    sensitivity: 0,
    contentNotes: [],
    source: { kind: "grok", model: "Grok", stage: "ai-initial-draft", generatedAt: "2026-10-15" },
    reviewStatus,
  };
}

function envelope(questions) {
  return { schemaVersion: 1, series: "adults", publicationStatus: "unpublished", questions };
}

test("empty series is valid input but cannot be release-ready", () => {
  const report = validateDataset(envelope([]), { series: "adults" });
  assert.equal(report.questionCount, 0);
  assert.equal(report.readyForRelease, false);
  assert.ok(report.issues.some((issue) => issue.severity === "info" && /空/u.test(issue.message)));
});

test("valid Grok draft metadata passes structure checks while remaining pending human review", () => {
  const report = validateDataset(envelope([draftQuestion()]), { series: "adults" });
  assert.equal(report.issues.some((issue) => issue.severity === "error"), false);
  assert.equal(report.readyForRelease, false);
  assert.ok(report.issues.some((issue) => /レビュー待ち/u.test(issue.message)));
});

test("release readiness requires approved coverage for every intensity and Level", () => {
  const questions = [];
  for (const intensity of ["lite", "deep"]) {
    for (let level = 1; level <= 4; level += 1) {
      for (let n = 1; n <= 3; n += 1) {
        questions.push(draftQuestion({
          id: `adults-communication-${intensity}-l${level}-${String(n).padStart(3, "0")}`,
          text: `質問${intensity}${level}${n}はどんなことですか？`,
          followUp: `深掘り${intensity}${level}${n}はどう感じますか？`,
          level,
          intensity,
          reviewStatus: "approved",
        }));
      }
    }
  }
  const report = validateDataset(envelope(questions), { series: "adults", requireReleaseReady: true });
  assert.equal(report.readyForRelease, true);
  assert.equal(report.issues.some((issue) => issue.severity === "error"), false);
});

test("duplicate IDs, questions, wrong source labels, and pressure or explicit wording are rejected", () => {
  const repeated = draftQuestion();
  const unsafe = draftQuestion({
    id: "adults-communication-lite-l1-002",
    text: "相手に性器の写真を必ず送らせるにはどうしますか？",
  });
  const report = validateDataset(envelope([repeated, { ...repeated }, unsafe]), { series: "adults" });
  assert.ok(report.issues.some((issue) => /IDが重複/u.test(issue.message)));
  assert.ok(report.issues.some((issue) => /質問文が/u.test(issue.message)));
  assert.ok(report.issues.some((issue) => /禁止表現/u.test(issue.message)));
});

test("near-duplicate Japanese question wording is detected", () => {
  const left = "最近の生活で、少し安心できる時間はどんなときですか？";
  const right = "最近の生活の中で、少し安心できる時間はどんなときですか？";
  assert.ok(textSimilarity(left, right) >= 0.76);
  const report = validateDataset(envelope([
    draftQuestion({ text: left }),
    draftQuestion({ id: "adults-communication-lite-l1-002", text: right }),
  ]), { series: "adults" });
  assert.ok(report.issues.some((issue) => /類似度の高い質問/u.test(issue.message)));
});

test("duplicate questions already published in a legacy series are rejected", () => {
  const report = validateDataset(envelope([draftQuestion({ text: "ここに既存シリーズと同じ質問文" })]), {
    series: "adults",
    legacyQuestions: [{ id: "legacy-001", text: "ここに既存シリーズと同じ質問文" }],
  });
  assert.ok(report.issues.some((issue) => /既存シリーズの質問/u.test(issue.message)));
});
