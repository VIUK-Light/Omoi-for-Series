import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertDisplayCopy, displayTextForQuestion } from "../shared/display-copy.mjs";
import { mergeLegacyFollowUps } from "../shared/content-policy.mjs";
import { followUpForQuestion } from "../shared/question-engine.mjs";
import { questionCardMarkup } from "../shared/question-card.mjs";
import { readDisplaySources, validateDisplaySources, seriesIds } from "./verify-display-copy.mjs";
import { CARD_PREVIEW_CASES } from "./card-preview-cases.mjs";

const main = { id: "a", text: "休日は何をしたい？", level: 1 };
const source = { kind: "codex", model: "GPT-6", stage: "ai-initial-draft", generatedAt: "2026-10-15" };
const followUps = { schemaVersion: 1, series: "couples", source, reviewStatus: "pending", questions: { a: "誰と過ごしたい？" } };
const entry = () => ({
  sourceSha256: createHash("sha256").update(JSON.stringify([main.text, followUps.questions.a])).digest("hex"),
  text: { mobile: "休日は\n何をしたい？", desktop: "休日は何をしたい？" },
  followUp: { mobile: "誰と\n過ごしたい？", desktop: "誰と過ごしたい？" },
});
const data = () => ({ schemaVersion: 1, series: "couples", questions: { a: entry() } });

test("responsive display copy changes line breaks without mutating source records", () => {
  const question = { ...main, followUp: followUps.questions.a };
  const before = structuredClone(question);
  const entries = assertDisplayCopy(data(), "couples", [question]);
  assert.equal(displayTextForQuestion(question, "text", entries, true), "休日は\n何をしたい？");
  assert.equal(displayTextForQuestion(question, "text", entries, false), main.text);
  assert.equal(displayTextForQuestion(question, "followUp", entries, true), "誰と\n過ごしたい？");
  assert.equal(displayTextForQuestion({ ...question, id: "untouched" }, "text", entries, true), main.text);
  assert.deepEqual(question, before);
});

test("pending follow-ups remain blocked even if a display override exists", () => {
  const entries = assertDisplayCopy(data(), "couples", [main]);
  const production = mergeLegacyFollowUps([main], followUps, "couples")[0];
  assert.equal(displayTextForQuestion(production, "followUp", entries, true), null);
  assert.equal(followUpForQuestion(production, "couples"), "そう感じるようになったきっかけはありますか？");
  const local = mergeLegacyFollowUps([main], followUps, "couples", { allowDrafts: true })[0];
  assert.equal(displayTextForQuestion(local, "followUp", entries, true), "誰と\n過ごしたい？");
});

test("malformed variants, injected markup, unknown IDs and cross-device rewrites are rejected", () => {
  for (const change of [
    (copy) => { copy.questions.a.text.desktop = "違う質問？"; },
    (copy) => { copy.questions.a.text.mobile = ""; },
    (copy) => { delete copy.questions.a.text.desktop; },
    (copy) => { copy.questions.a.text.mobile = "<script>alert(1)</script>"; },
    (copy) => { copy.questions.a.reviewStatus = "approved"; },
    (copy) => { copy.questions.unknown = copy.questions.a; },
  ]) {
    const copy = data(); change(copy);
    assert.throws(() => assertDisplayCopy(copy, "couples", [main]));
  }
});

test("source edits and source-pair mismatches invalidate the display fingerprint", () => {
  const inputs = { questions: [main], followUpData: followUps, display: data() };
  assert.deepEqual(validateDisplaySources("couples", inputs).issues, []);
  const changed = { ...inputs, questions: [{ ...main, text: "変更した原文" }] };
  assert.ok(validateDisplaySources("couples", changed).issues.some((issue) => issue.includes("原文ハッシュ")));
});

test("exactly the 12 selected sides are registered and keep their source fingerprints", () => {
  const expected = new Set(CARD_PREVIEW_CASES.map(({ series, id, side }) => `${series}/${id}/${side}`));
  const actual = new Set();
  assert.equal(expected.size, 12);
  assert.equal(CARD_PREVIEW_CASES.filter(({ side }) => side === "text").length, 6);
  for (const series of seriesIds) {
    const inputs = readDisplaySources(series);
    const before = JSON.stringify(inputs.questions);
    const report = validateDisplaySources(series, inputs);
    assert.deepEqual(report.issues, []);
    for (const [id, copy] of Object.entries(report.entries)) {
      for (const field of ["text", "followUp"]) if (copy[field]) actual.add(`${series}/${id}/${field}`);
    }
    assert.equal(JSON.stringify(inputs.questions), before);
  }
  assert.deepEqual(actual, expected);
});

test("shared card markup preserves the authored text and the hidden-face contract", () => {
  const markup = questionCardMarkup({ id: 'a"', target: "Couples", text: "主質問\n<script>", followUp: "追加の質問", revealed: true });
  assert.ok(markup.includes('data-question-id="a&quot;"'));
  assert.ok(markup.includes('aria-labelledby="follow-up-question"'));
  assert.ok(markup.includes('aria-label="メインの質問" aria-hidden="true" inert'));
  assert.ok(markup.includes('aria-label="深掘り質問" aria-hidden="false"'));
  assert.ok(markup.includes("主質問\n&lt;script&gt;"));
  assert.ok(!markup.includes('style="font-size'));
});
