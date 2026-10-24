import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { questionMarkup } from "../shared/question-text.mjs";

test("the renderer adds no inferred word boundaries or hard line breaks", () => {
  const text = "恋人がすぐに返信できない時、どんな伝え方だと安心する？";
  assert.equal(questionMarkup(text), text);
  assert.ok(!questionMarkup(text).includes("<wbr>"));
});

test("wrapping escapes HTML before inserting only optional line breaks", () => {
  const markup = questionMarkup('「<script> & "言葉"」は？');
  assert.ok(!markup.includes("<script>"));
  assert.ok(markup.includes("&lt;script&gt;"));
  assert.ok(markup.includes("&amp;"));
  assert.ok(markup.includes("&quot;"));
  assert.ok(!markup.includes("<br>"));
});

test("explicit line breaks and empty text are preserved", () => {
  const text = "今日の気持ちは？\n\n話したいことは？";
  assert.equal(questionMarkup(text), text);
  assert.equal(questionMarkup(""), "");
});

test("all main questions and follow-ups preserve original characters", () => {
  let checked = 0;
  for (const series of ["couples", "family", "friends", "adults", "self-care"]) {
    const data = JSON.parse(readFileSync(new URL(`../shared/questions/${series}.json`, import.meta.url)));
    const questions = Array.isArray(data) ? data : data.questions;
    const legacy = ["couples", "family", "friends"].includes(series)
      ? JSON.parse(readFileSync(new URL(`../shared/followups/${series}.json`, import.meta.url)))
      : null;
    for (const question of questions) {
      for (const text of [question.text, question.followUp, legacy?.questions?.[question.id]]) {
        if (typeof text !== "string") continue;
        const expected = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
        assert.equal(questionMarkup(text).replaceAll("<wbr>", ""), expected, `${series}: ${question.id}`);
        checked += 1;
      }
    }
  }
  assert.ok(checked >= 1000, `Checked ${checked} texts`);
});

// Regression: the screenshot split "家で休みたい気持ちが" across two lines.
test("the holiday question uses authored lines without automatic phrase breaks", () => {
  const questions = JSON.parse(readFileSync(new URL("../shared/questions/couples.json", import.meta.url)));
  const question = questions.find(({ id }) => id === "editorial-couples-fit-001");
  assert.equal(questionMarkup(question.text), question.text);
  assert.deepEqual(question.text.split("\n"), ["二人の休日に、", "外出したい気持ちと", "家で休みたい気持ちが", "違ったらどう決めたい？"]);
});
