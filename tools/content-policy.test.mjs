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
