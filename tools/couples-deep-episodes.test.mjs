import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { COUPLES_EPISODE_CURATION, applyCouplesDeepEpisodes } from "./couples-deep-episodes.mjs";
import { COUPLES_LITE_RESTORATIONS, restoreCouplesLiteQuestions } from "./couples-lite-restorations.mjs";
import { COUPLES_RESEARCH_CURATION, applyResearchedCouplesEpisodes } from "./couples-researched-episodes.mjs";
import { COUPLES_COMPRESSED_CURATION, applyCompressedCouplesEpisodes } from "./couples-compressed-episodes.mjs";
import { COUPLES_DEEP_SELECTION, selectCouplesDeepQuestions } from "./couples-deep-selection.mjs";
import { filterQuestions, discussionPromptsForQuestion, COUPLES_SHARED_DISCUSSION_OPENING } from "../shared/question-engine.mjs";
import { mergeLegacyFollowUps } from "../shared/content-policy.mjs";
import { hasVerifiedProvidedCouplesText } from "./couples-provided-content.mjs";

const read = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const cards = read("shared/questions/couples.json");
const follow = read("shared/followups/couples.json");
const audit = COUPLES_EPISODE_CURATION;
const selection = COUPLES_DEEP_SELECTION;
const originalPrompts = read("tools/curation-couples-discussions.json").questions;
const originalLite = cards.filter(question => question.level < 3);
const stripFollowUp = ({ followUp, ...question }) => question;
const originalInput = [...originalLite, ...audit.rewritten.map(entry => stripFollowUp(entry.before))];
const episodes = applyCouplesDeepEpisodes(originalInput);
const researched = applyResearchedCouplesEpisodes(episodes);
const compressed = applyCompressedCouplesEpisodes(researched);
const researchPrompts = { ...originalPrompts, ...Object.fromEntries(COUPLES_RESEARCH_CURATION.rewritten.map(entry => [entry.after.question.id, entry.after.prompts])) };
const compressedPrompts = { ...researchPrompts, ...Object.fromEntries(COUPLES_COMPRESSED_CURATION.rewritten.map(entry => [entry.after.question.id, entry.after.prompts])) };
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const pairs = (questions, prompts) => questions.map(question => ({ question, prompts: prompts[question.id] ?? [follow.questions[question.id]] }));

test("Deep contains only the ten supplied images and two new references while all 116 Lite pairs stay intact", () => {
  const deep = filterQuestions(cards, { intensity: "deep" });
  const lite = filterQuestions(cards, { intensity: "lite" });
  assert.equal(cards.length, 128);
  assert.equal(deep.length, 12);
  assert.equal(lite.length, 116);
  assert.deepEqual(deep.map(q => q.id), [...selection.retainedIds, ...selection.added.map(entry => entry.question.id)]);
  assert.equal(hash(pairs(lite, {})), selection.unchangedLiteSha256);
  assert.equal(originalLite.length, 100);
  assert.equal(hash(originalLite.map(q => ({ ...q, followUp: follow.questions[q.id] }))), audit.unchangedLiteSha256);
  const ids = new Set(cards.map(q => q.id));
  assert.equal(selection.excludedIds.length, 122);
  for (const id of selection.excludedIds) {
    assert.ok(!ids.has(id), id);
    assert.ok(!Object.hasOwn(follow.questions, id), id);
    assert.ok(!Object.hasOwn(follow.discussionQuestions, id), id);
    assert.ok(!Object.hasOwn(follow.questionSources, id), id);
  }
});

test("editorial history regenerates the exact selected deck and rejects missing or drifted stage inputs", () => {
  assert.equal(audit.rewritten.length, 132);
  assert.equal(new Set(audit.rewritten.map(entry => entry.before.id)).size, 132);
  assert.deepEqual(restoreCouplesLiteQuestions(selectCouplesDeepQuestions(compressed)), cards);
  assert.throws(() => applyCouplesDeepEpisodes(originalInput.filter(q => q.id !== audit.rewritten[0].before.id)));
  const drifted = structuredClone(originalInput);
  drifted.find(q => q.level >= 3).text = "一致しない入力";
  assert.throws(() => applyCouplesDeepEpisodes(drifted));
  assert.throws(() => selectCouplesDeepQuestions(compressed.filter(q => q.id !== selection.retainedIds[0])));
  assert.throws(() => selectCouplesDeepQuestions([...compressed, { ...compressed.find(q => q.level >= 3), id: "unknown-episode" }]));
});

test("each of the twelve events has three distinct prompts and pending prompts remain gated in production", () => {
  const deep = filterQuestions(cards, { intensity: "deep" });
  assert.equal(Object.keys(follow.questions).length, cards.length);
  assert.equal(Object.keys(follow.discussionQuestions).length, 12);
  const expected = Object.fromEntries(selection.retainedIds.map(id => [id, compressedPrompts[id]]));
  for (const entry of selection.added) expected[entry.question.id] = entry.prompts;
  assert.deepEqual(follow.discussionQuestions, expected);
  const preview = mergeLegacyFollowUps(cards, follow, "couples", { allowDrafts: true });
  const production = mergeLegacyFollowUps(cards, follow, "couples");
  const seen = new Set();
  for (const question of deep) {
    const prompts = follow.discussionQuestions[question.id];
    assert.equal(prompts.length, 3);
    assert.equal(prompts[0], COUPLES_SHARED_DISCUSSION_OPENING);
    assert.equal(follow.questions[question.id], prompts[0]);
    if (question.textFormat === "verbatim-consultation") assert.ok(hasVerifiedProvidedCouplesText(question));
    else assert.ok(question.text.length >= 100 && question.text.length <= 160, question.id);
    for (const [index,prompt] of prompts.entries()) {
      if(index>0) assert.ok(!seen.has(prompt), prompt);
      seen.add(prompt);
      assert.ok(prompt.length <= 35, question.id);
      assert.ok(!/アキさん|ユウさん/u.test(prompt), question.id);
    }
    assert.deepEqual(discussionPromptsForQuestion(preview.find(q => q.id === question.id), "couples"), prompts);
    const released = production.find(q => q.id === question.id);
    assert.equal(released.followUps, undefined);
    assert.equal(released.followUp, undefined);
    assert.deepEqual(discussionPromptsForQuestion(released, "couples"), [COUPLES_SHARED_DISCUSSION_OPENING]);
  }
  assert.equal(seen.size, 25);
  assert.equal(follow.reviewStatus, "pending");
});

test("all twelve discussions open with the requested question and retain the two personal reflection prompts", () => {
  const entries = [
    ...COUPLES_COMPRESSED_CURATION.rewritten.map(entry => ({ id: entry.after.question.id, prompts: entry.after.prompts, axis: entry.discussionAxis, style: entry.discussionStyle })),
    ...selection.added.map(entry => ({ id: entry.question.id, prompts: entry.prompts, axis: entry.discussionAxis, style: entry.discussionStyle })),
  ];
  assert.equal(entries.length, 12);
  for (const entry of entries) {
    assert.equal(entry.style, "opinion-then-reflection");
    assert.ok(entry.axis, entry.id);
    assert.deepEqual(follow.discussionQuestions[entry.id], entry.prompts);
    assert.equal(entry.prompts[0], COUPLES_SHARED_DISCUSSION_OPENING, entry.id);
  }
  for(const entry of COUPLES_COMPRESSED_CURATION.rewritten) assert.deepEqual(entry.after.prompts.slice(1),entry.previousReflectionPrompts.slice(1));
  for(const entry of selection.added) assert.deepEqual(entry.prompts.slice(1),entry.previousReflectionPrompts.slice(1));
  assert.equal(hash(cards), selection.mainDeckSha256BeforeReflection);
  assert.deepEqual(follow.discussionQuestions["editorial-couples-episode-015"], [
    "あなたはどう考える？",
    "あなたが人を信じられるのは、どんな言葉や行動がある時？",
    "不安になった時、相手にどう接してもらいたい？",
  ]);
});

test("the sixteen serious direct questions remain in Lite with their original levels and provenance", () => {
  const restorations = COUPLES_LITE_RESTORATIONS.restored;
  assert.equal(restorations.length, 16);
  for (const { before, after } of restorations) {
    assert.deepEqual(cards.find(q => q.id === after.id), stripFollowUp(after));
    assert.equal(after.intensity, "lite");
    for (const field of ["id", "level", "source", "category", "text"]) assert.equal(after[field], before[field]);
    assert.equal(follow.questions[after.id], after.followUp);
  }
  assert.throws(() => restoreCouplesLiteQuestions(cards));
});

test("the archived research stage keeps source provenance and the unchanged stage fingerprints", () => {
  const report = COUPLES_RESEARCH_CURATION;
  assert.equal(report.rewritten.length, 32);
  assert.equal(report.sources.length, 17);
  const sourceIds = new Set(report.sources.map(source => source.id));
  const used = new Set();
  const changed = new Set(report.rewritten.map(entry => entry.after.question.id));
  for (const entry of report.rewritten) {
    assert.ok(entry.researchBasis && entry.fictionalChanges && entry.sourceIds.length);
    for (const id of entry.sourceIds) { assert.ok(sourceIds.has(id), id); used.add(id); }
    assert.deepEqual(researched.find(q => q.id === entry.after.question.id), entry.after.question);
    const earlier = audit.rewritten.find(({ after }) => after.id === entry.before.question.id);
    assert.deepEqual(entry.before.question, stripFollowUp(earlier.after));
    assert.deepEqual(entry.before.prompts, originalPrompts[entry.before.question.id]);
  }
  assert.deepEqual(used, sourceIds);
  for (const source of report.sources) {
    assert.equal(new URL(source.url).protocol, "https:");
    assert.ok(["survey", "public-account"].includes(source.kind));
    assert.ok(source.publisher && source.sampleOrLimit && source.checkedFacts.length);
    assert.ok(source.publishedAt <= report.editedAt);
  }
  assert.equal(hash(pairs(filterQuestions(cards, { intensity: "lite" }), {})), report.unchangedLiteSha256);
  assert.equal(hash(pairs(researched.filter(q => q.level >= 3 && !changed.has(q.id)), researchPrompts)), report.unchangedDeepSha256);
  assert.throws(() => applyResearchedCouplesEpisodes(episodes.filter(q => q.id !== report.rewritten[0].before.question.id)));
});

test("all ten compressed image cards remain selected and their earlier revision is reproducible", () => {
  const report = COUPLES_COMPRESSED_CURATION;
  assert.deepEqual(report.rewritten.map(entry => entry.reference.imageNumber), [1,2,3,4,5,6,7,8,9,10]);
  const ids = new Set(report.rewritten.map(entry => entry.after.question.id));
  for (const entry of report.rewritten) {
    assert.equal(entry.reference.kind, "user-provided");
    assert.equal(entry.reference.verification, "unverified");
    assert.match(entry.reference.contentSha256, /^[a-f0-9]{64}$/u);
    assert.ok(entry.preservedCore && entry.removedDetails);
    assert.deepEqual(cards.find(q => q.id === entry.after.question.id), entry.after.question);
    assert.deepEqual(follow.discussionQuestions[entry.after.question.id], entry.after.prompts);
  }
  assert.deepEqual(selection.retainedIds, [...ids]);
  assert.equal(hash(pairs(compressed.filter(q => q.level >= 3 && !ids.has(q.id)), compressedPrompts)), report.unchangedDeepSha256);
  assert.throws(() => applyCompressedCouplesEpisodes(researched.filter(q => q.id !== report.rewritten[0].before.question.id)));
});

test("the two new references preserve the face-preference and private-streamer-message dilemmas", () => {
  assert.equal(selection.added.length, 2);
  assert.deepEqual(selection.added.map(entry => entry.reference.referenceNumber), [11,12]);
  assert.deepEqual(selection.added.map(entry => entry.reference.format), ["image","text"]);
  assert.ok(selection.added.every(entry => entry.reference.kind === "user-provided" && entry.reference.verification === "unverified"));
  assert.match(selection.added[0].question.text, /人柄/u);
  assert.match(selection.added[0].question.text, /推し/u);
  assert.match(selection.added[1].question.text, /配信者/u);
  assert.match(selection.added[1].question.text, /DM/u);
  assert.match(selection.added[1].question.text, /バレたら/u);
  for (const entry of selection.added) {
    assert.ok(entry.preservedCore && entry.removedDetails);
    assert.deepEqual(cards.find(q => q.id === entry.question.id), entry.question);
  }
});

test("the supplied streamer consultation stays byte-for-byte unchanged and has a bounded validation exception", () => {
  const question = cards.find(q => q.id === "editorial-couples-episode-134");
  assert.equal(question.source, "user-provided");
  assert.equal(question.textFormat, "verbatim-consultation");
  assert.equal(createHash("sha256").update(question.text).digest("hex"), "3b54bfb7d00747bc4a04c24491b476a46c5c3df0042975287396b38fedd9a4c2");
  assert.equal(question.text.endsWith("アドバイスください。"), true);
  assert.ok(!question.text.includes("これはそのままで"));
  assert.ok(hasVerifiedProvidedCouplesText(question));
  assert.equal(hasVerifiedProvidedCouplesText({ ...question, text: question.text + "。" }), false);
  assert.equal(hasVerifiedProvidedCouplesText({ ...question, id: "different-id" }), false);
  assert.equal(hasVerifiedProvidedCouplesText({ ...question, source: "editorial" }), false);
  const display = read("shared/display-copy/couples.json").questions[question.id].text;
  assert.equal(display.mobile, question.text);
  assert.equal(display.desktop, question.text);
});
