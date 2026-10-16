import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeLegacyFollowUps, canPreviewDrafts, canShowReviewedContent } from '../shared/content-policy.mjs';
import { filterQuestions, followUpForQuestion } from '../shared/question-engine.mjs';
import { validateDataset, normalizeQuestionText } from './validate-grok-questions.mjs';
import { SERIES_CONTRACTS } from "./series-contracts.mjs";
const legacyTotal = ["couples","family","friends"].reduce((n,s)=>n+SERIES_CONTRACTS[s].total,0);
const allTotal = Object.values(SERIES_CONTRACTS).reduce((n,c)=>n+c.total,0);
const read = path => JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const manifest = read('shared/series-manifest.json');

test('all curated legacy cards have contextual followups without mutating their source data', () => {
  let count=0;
  const seen = new Set();
  for(const series of ['couples','family','friends']) {
    const base=read(`shared/questions/${series}.json`);
    const before=JSON.stringify(base);
    const sidecar=read(`shared/followups/${series}.json`);
    const merged=mergeLegacyFollowUps(base,sidecar,series,{allowDrafts:true});
    assert.equal(merged.length,base.length);
    for(let i=0;i<merged.length;i+=1){
      const q=merged[i];
      assert.equal(q.id,base[i].id);
      assert.equal(q.text,base[i].text);
      assert.equal(q.source,base[i].source);
      assert.equal(followUpForQuestion(q,series),sidecar.questions[q.id]);
      assert.notEqual(q.followUp,'そう感じるようになったきっかけはありますか？');
      assert.ok(!seen.has(q.followUp));seen.add(q.followUp);count+=1;
    }
    assert.equal(JSON.stringify(base),before);
    assert.equal(sidecar.reviewStatus,'pending');
  }
  assert.equal(count,legacyTotal);
});
test('original AI datasets retain 64 pairs each and provided Adults additions remain separately attributed', () => {
  for(const series of ['adults','self-care']) {
    const data=read(`shared/questions/${series}.json`);
    const generated=data.questions.filter(q=>q.source.kind==='codex');
    assert.equal(generated.length,64);
    assert.equal(data.questions.length,series==='adults'?94:64);
    assert.equal(new Set(data.questions.map(q=>q.followUp)).size,data.questions.length);
    assert.ok(data.questions.every(q=>q.reviewStatus==='pending'));
    const report=validateDataset(data,{series});
    assert.deepEqual(report.issues.filter(issue=>issue.severity==='error'),[]);
    assert.equal(report.readyForRelease,false);
    for(const intensity of ['lite','deep']) for(const level of [1,2,3,4]) assert.equal(filterQuestions(generated,{intensity,level}).length,8);
  }
});
test('generated records are playable on localhost, but never become published by generation', () => {
  for(const series of ['adults','self-care']) {
    const data=read(`shared/questions/${series}.json`);
    const release=manifest.series[series];
    assert.equal(release.status,'unpublished');
    assert.equal(data.publicationStatus,'unpublished');
    const local=canPreviewDrafts(release,{protocol:'http:',hostname:'127.0.0.1'});
    const production=canPreviewDrafts(release,{protocol:'https:',hostname:'omoi-for.viuk-light.org'});
    assert.equal(local,true);assert.equal(production,false);
    assert.equal(data.questions.filter(q=>canShowReviewedContent(q.reviewStatus,{allowDrafts:local})).length,series==='adults'?94:64);
    assert.equal(data.questions.filter(q=>canShowReviewedContent(q.reviewStatus,{allowDrafts:production})).length,0);
  }
});

test('all retained card pairs have different normalized followups across the five series', () => {
  const seen = new Set();
  for (const series of ['couples','family','friends','adults','self-care']) {
    const legacy=['couples','family','friends'].includes(series);
    const data=read(`shared/${legacy?'followups':'questions'}/${series}.json`);
    const followUps=legacy?Object.values(data.questions):data.questions.map(question=>question.followUp);
    for (const text of followUps) {
      const key=normalizeQuestionText(text);
      assert.ok(!seen.has(key), `Duplicate followup: ${text}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size,allTotal);
});

test('provided Adults records retain import provenance and an unchanged text fingerprint', async () => {
  const {createHash}=await import('node:crypto');
  const records=read('shared/questions/adults.json').questions.filter(q=>q.source.kind==='user-provided');
  assert.equal(records.length,30);
  for (const q of records) {
    assert.equal(q.source.stage,'provided-draft');
    assert.ok(q.source.original.kind && q.source.original.model);
    assert.equal(q.source.contentSha256,createHash('sha256').update(JSON.stringify([q.text,q.followUp])).digest('hex'));
    assert.equal(q.reviewStatus,'pending');
  }
});
