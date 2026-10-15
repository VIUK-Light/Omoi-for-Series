import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  chooseSessionQuestions,
  filterQuestions,
  followUpForQuestion,
  intensityForQuestion,
  isDevelopmentHost,
  nextQuestionIndex,
} from "../shared/question-engine.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const couples = JSON.parse(readFileSync(resolve(root, "shared/questions/couples.json"), "utf8"));
const fixedRandom = () => 0.42;

test("legacy series keeps question records unchanged and maps Lite/Deep from its existing levels", () => {
  const before = JSON.stringify(couples);
  const levelCounts = Object.fromEntries([1, 2, 3, 4].map((level) => [
    level,
    filterQuestions(couples, { level }).length,
  ]));
  const liteLevelOne = filterQuestions(couples, { intensity: "lite", level: 1 });
  const deepLevelFour = filterQuestions(couples, { intensity: "deep", level: 4 });
  assert.deepEqual(levelCounts, { 1: 115, 2: 109, 3: 111, 4: 142 });
  assert.equal(filterQuestions(couples, { intensity: "lite" }).length, 224);
  assert.equal(filterQuestions(couples, { intensity: "deep" }).length, 253);
  assert.equal(liteLevelOne.length, 115);
  assert.equal(deepLevelFour.length, 142);
  assert.ok(liteLevelOne.every((question) => question.level === 1));
  assert.ok(deepLevelFour.every((question) => question.level === 4));
  assert.equal(JSON.stringify(couples), before);
});

test("new question intensity is independent of Level", () => {
  const questions = [
    { id: "lite-l3", level: 3, intensity: "lite" },
    { id: "deep-l1", level: 1, intensity: "deep" },
  ];
  assert.equal(intensityForQuestion(questions[0]), "lite");
  assert.deepEqual(filterQuestions(questions, { intensity: "lite", level: 3 }), [questions[0]]);
  assert.deepEqual(filterQuestions(questions, { intensity: "deep", level: 1 }), [questions[1]]);
});

test("session picks contain no duplicate IDs and prefer unseen cards between sessions", () => {
  const pool = Array.from({ length: 8 }, (_, index) => ({ id: `q${index + 1}` }));
  const first = chooseSessionQuestions(pool, 5, new Set(), fixedRandom);
  assert.equal(first.questions.length, 5);
  assert.equal(new Set(first.questions.map((question) => question.id)).size, 5);
  const second = chooseSessionQuestions(pool, 3, first.usedIds, fixedRandom);
  assert.equal(second.questions.length, 3);
  assert.equal(new Set(second.questions.map((question) => question.id)).size, 3);
  assert.ok(second.questions.every((question) => !first.usedIds.has(question.id)));
});

test("a depleted pool rolls over without repeating the immediately previous card when possible", () => {
  const pool = Array.from({ length: 4 }, (_, index) => ({ id: `q${index + 1}` }));
  const first = chooseSessionQuestions(pool, 3, new Set(), fixedRandom);
  const second = chooseSessionQuestions(pool, 3, first.usedIds, fixedRandom);
  assert.equal(second.questions.length, 3);
  assert.equal(new Set(second.questions.map((question) => question.id)).size, 3);
  assert.notEqual(second.questions[0].id, [...first.usedIds].at(-1));
});

test("one-question draws continue without a session limit and avoid adjacent repeats", () => {
  const pool = Array.from({ length: 4 }, (_, index) => ({ id: `q${index + 1}` }));
  let usedIds = new Set();
  let previousId = null;
  const drawn = [];
  for (let index = 0; index < 12; index += 1) {
    const result = chooseSessionQuestions(pool, 1, usedIds, fixedRandom);
    assert.equal(result.questions.length, 1);
    const nextId = result.questions[0].id;
    if (previousId) assert.notEqual(nextId, previousId);
    drawn.push(nextId);
    previousId = nextId;
    usedIds = result.usedIds;
  }
  assert.equal(drawn.length, 12);
});

test("skip and next advance to the next card and stop at the session end", () => {
  assert.equal(nextQuestionIndex(0, 3), 1);
  assert.equal(nextQuestionIndex(2, 3), 3);
  assert.equal(nextQuestionIndex(0, 0), 0);
});

test("legacy questions get a small series-specific follow-up without changing source JSON", () => {
  assert.equal(followUpForQuestion(couples[0], "couples"), "そう感じるようになったきっかけはありますか？");
  assert.equal(followUpForQuestion({ followUp: "  自分にとって何が大切ですか？  " }, "self-care"), "自分にとって何が大切ですか？");
});

test("development preview only activates on local or file URLs", () => {
  assert.equal(isDevelopmentHost({ protocol: "http:", hostname: "localhost" }), true);
  assert.equal(isDevelopmentHost({ protocol: "https:", hostname: "omoi-for.viuk-light.org" }), false);
  assert.equal(isDevelopmentHost({ protocol: "file:", hostname: "" }), true);
});
