import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seriesFitIssues} from './series-fit-rules.mjs';
const read=name=>JSON.parse(readFileSync(new URL(`../${name}`,import.meta.url),'utf8'));

test('generic morality, public outrage and unrelated categories are rejected for relationship series',()=>{
 assert.ok(seriesFitIssues({category:'values',text:'何もしない選択にも罪はある？'},'couples').length);
 assert.ok(seriesFitIssues({category:'romance',text:'SNSで、イベント出店の店員が不衛生そうな試食対応をしている動画を見た。店名も顔も全部広めよう。'},'couples').length);
 assert.ok(seriesFitIssues({category:'ethicsMax',text:'相手と何が正義か議論したい？'},'couples').length);
 assert.ok(seriesFitIssues({category:'friendsValues',text:'正義のためなら嘘をついてもよい？'},'friends').length);
 assert.ok(seriesFitIssues({category:'familyValues',text:'好きな飲み物は何？'},'family').length);
});
test('actual relationship conflicts, boundaries and emotional depth are retained',()=>{
 assert.deepEqual(seriesFitIssues({category:'jealousy',text:'恋人の交友関係について、二人で決めたいことは？'},'couples'),[]);
 assert.deepEqual(seriesFitIssues({category:'familyBoundaries',text:'家族との距離を変える時、罪悪感とどう付き合いたい？'},'family'),[]);
 assert.deepEqual(seriesFitIssues({category:'friendsCommunication',text:'私たちの間で傷ついたことを話すなら、どんな場がよい？'},'friends'),[]);
});
test('every retained Couples, Family and Friends question passes the audience-fit guard',()=>{
 for(const s of ['couples','family','friends']) for(const q of read(`shared/questions/${s}.json`)) assert.deepEqual(seriesFitIssues(q,s),[],`${s}/${q.id}`);
});
test('removed and superseded questions never remain in cards or followup mappings',()=>{
 for(const s of ['couples','family','friends']){
  const report=read(`tools/curation-${s}.json`);
  const cards=read(`shared/questions/${s}.json`);
  const follow=read(`shared/followups/${s}.json`);
  const ids=new Set(cards.map(q=>q.id));
  for(const entry of report.removed){const id=entry.id??entry.before?.id;assert.ok(!ids.has(id),`${s}: removed ${id}`);assert.ok(!Object.hasOwn(follow.questions,id));}
  const rewrites=report.rewritten??report.rewrites??report.changed;
  assert.ok(Array.isArray(rewrites),`${s}: missing curation records`);
  for(const entry of rewrites){const old=entry.oldId??entry.before.id;const next=entry.newId??entry.after.id;assert.ok(!ids.has(old),`${s}: old ${old}`);assert.ok(ids.has(next),`${s}: missing ${next}`);assert.ok(Object.hasOwn(follow.questions,next));
   const current=cards.find(q=>q.id===next);
   const expectedText=entry.revisedText??(typeof entry.after==='string'?entry.after:entry.after.text);
   const expectedFollow=entry.revisedFollowUp??entry.afterFollowUp??entry.after.followUp;
   assert.equal(current.text,expectedText,`${s}/${next}: audit main`);
   assert.equal(follow.questions[next],expectedFollow,`${s}/${next}: audit followup`);
  }
  for(const entry of report.followUpOnlyRewrites??[]){
   assert.ok(ids.has(entry.id));
   assert.equal(follow.questions[entry.id],entry.afterFollowUp);
  }
 }
});
