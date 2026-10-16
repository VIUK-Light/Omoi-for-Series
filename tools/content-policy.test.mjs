import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidAiSource, canShowReviewedContent, canPreviewDrafts, mergeLegacyFollowUps } from '../shared/content-policy.mjs';
import { validateFollowUpDataset } from './verify-followups.mjs';
const source = { kind:'codex', model:'GPT-6', stage:'ai-initial-draft', generatedAt:'2026-10-15' };
const mains = [{id:'a',text:'休日をどう過ごしたい？'}, {id:'b',text:'最近、楽しみな予定は？'}];
const data = () => ({schemaVersion:1,series:'couples',source,reviewStatus:'pending',questions:{a:'その過ごし方で、いちばん楽しみなのは何？',b:'その予定に向けて、今から楽しめる準備はある？'}});

test('Grok and Codex sources remain distinct and must use real dates', () => {
  assert.equal(hasValidAiSource(source),true);
  assert.equal(hasValidAiSource({...source,kind:'grok',model:'Grok'}),true);
  assert.equal(hasValidAiSource({...source,kind:'grok'}),false);
  assert.equal(hasValidAiSource({...source,generatedAt:'2026-02-31'}),false);
});
test('AI draft preview needs an explicit flag and a genuine local hostname', () => {
  for(const hostname of ['localhost','127.0.0.1','::1']) assert.equal(canPreviewDrafts({draftPreview:true},{protocol:'http:',hostname}),true);
  for(const hostname of ['omoi-for.viuk-light.org','127.0.0.1.example.com']) assert.equal(canPreviewDrafts({draftPreview:true},{protocol:'https:',hostname}),false);
  assert.equal(canPreviewDrafts({},{protocol:'http:',hostname:'localhost'}),false);
  assert.equal(canShowReviewedContent('pending'),false);
  assert.equal(canShowReviewedContent('approved'),true);
  assert.equal(canShowReviewedContent('pending',{allowDrafts:true}),true);
  assert.equal(canShowReviewedContent('rejected',{allowDrafts:true}),false);
});
test('pending legacy followups can be previewed locally without rewriting legacy records or leaking to production', () => {
  const before=JSON.stringify(mains);
  assert.equal(mergeLegacyFollowUps(mains,data(),'couples'),mains);
  const preview=mergeLegacyFollowUps(mains,data(),'couples',{allowDrafts:true});
  assert.equal(preview[0].followUp,data().questions.a);
  assert.notEqual(preview[0].followUp,preview[1].followUp);
  assert.equal(JSON.stringify(mains),before);
  assert.equal(mergeLegacyFollowUps(mains,{...data(),reviewStatus:'approved'},'couples')[1].followUp,data().questions.b);
});
test('missing, orphan, duplicate, main-identical and malformed followups are detected', () => {
  assert.throws(()=>mergeLegacyFollowUps(mains,{...data(),questions:{a:'追加の問い'}},'couples',{allowDrafts:true}),/未設定/u);
  assert.throws(()=>mergeLegacyFollowUps(mains,{...data(),questions:{...data().questions,unknown:'追加の問い'}},'couples',{allowDrafts:true}),/存在しない/u);
  assert.throws(()=>mergeLegacyFollowUps(mains,{...data(),source:{...source,kind:'grok'}},'couples'),/作成元/u);
  assert.ok(validateFollowUpDataset({...data(),questions:{a:'同じ追加質問ですか？',b:'同じ追加質問ですか？'}},mains,'couples').issues.some(x=>x.severity==='error'));
  assert.ok(validateFollowUpDataset({...data(),questions:{...data().questions,a:mains[0].text}},mains,'couples').issues.some(x=>x.severity==='error'));
});

test('nested question arrays are reported as data errors, not connection failures', async () => {
  const {assertQuestionDataset, QuestionDataError, questionLoadErrorMessage} = await import('../shared/content-policy.mjs');
  const record={id:'one',series:'adults',text:'親密さについて何を大切にしたいですか？',followUp:'それをどう伝えたいですか？',source,reviewStatus:'pending'};
  assert.doesNotThrow(()=>assertQuestionDataset({series:'adults',questions:[record]},'adults'));
  let failure;
  try{assertQuestionDataset({series:'adults',questions:[record,[record]]},'adults');}catch(error){failure=error;}
  assert.ok(failure instanceof QuestionDataError);
  assert.match(questionLoadErrorMessage(failure),/2件目に配列/u);
  assert.doesNotMatch(questionLoadErrorMessage(failure),/通信/u);
  assert.match(questionLoadErrorMessage(new SyntaxError('bad JSON')),/JSON形式/u);
  assert.match(questionLoadErrorMessage(new TypeError('Failed to fetch')),/通信/u);
});

test('provided provenance is distinct from verified AI attribution and text changes invalidate its fingerprint', async () => {
  const {createHash}=await import('node:crypto');
  const {hasValidQuestionSource}=await import('../shared/content-policy.mjs');
  const {validateDataset}=await import('./validate-grok-questions.mjs');
  const text='親しい相手との会話で大切にしたいことは？';
  const followUp='それを伝えるには、どんな場がよさそう？';
  const provided={kind:'user-provided',stage:'provided-draft',importedAt:'2026-10-16',original:{kind:'grok',model:'provided-version'},contentSha256:createHash('sha256').update(JSON.stringify([text,followUp])).digest('hex')};
  assert.equal(hasValidAiSource(provided),false);
  assert.equal(hasValidQuestionSource(provided,'adults'),true);
  assert.equal(hasValidQuestionSource(provided,'self-care'),false);
  const question={id:'adults-communication-lite-l1-001',series:'adults',category:'communication',level:1,intensity:'lite',text,followUp,sensitivity:0,contentNotes:[],source:provided,reviewStatus:'pending'};
  const data={schemaVersion:1,series:'adults',publicationStatus:'unpublished',questions:[question]};
  assert.equal(validateDataset(data,{series:'adults'}).issues.some(x=>x.severity==='error'),false);
  const changed={...data,questions:[{...question,text:text+'追加'}]};
  assert.ok(validateDataset(changed,{series:'adults'}).issues.some(x=>x.severity==='error' && /ハッシュ/u.test(x.message)));
});
