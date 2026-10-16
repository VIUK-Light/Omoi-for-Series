#!/usr/bin/env node
// Import user-provided Adults text verbatim; preserve claimed source separately.
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from './validate-grok-questions.mjs';
const root = resolve(fileURLToPath(import.meta.url),'../..');
const inputIndex = process.argv.indexOf('--input');
if(inputIndex < 0 || !process.argv[inputIndex+1]) throw new Error('--input FILE を指定してください。');
const importDateIndex = process.argv.indexOf('--date');
const importedAt = importDateIndex < 0 ? new Date().toISOString().slice(0,10) : process.argv[importDateIndex+1];
const input = JSON.parse(readFileSync(resolve(process.argv[inputIndex+1]),'utf8'));
const entries = (Array.isArray(input) ? input : input.questions)?.flat(Infinity);
if(!Array.isArray(entries) || !entries.length) throw new Error('取り込む質問がありません。');
const path = resolve(root,'shared/questions/adults.json');
const before = readFileSync(path,'utf8');
const data = JSON.parse(before);
if(data.series !== 'adults' || data.publicationStatus !== 'unpublished') throw new Error('未公開のAdultsデータだけが取り込み対象です。');
let added = 0;
for(const question of entries) {
  if(!question || typeof question !== 'object' || Array.isArray(question) || question.series !== 'adults') throw new Error('Adults質問オブジェクトではありません。');
  const existing = data.questions.find(q=>q.id === question.id);
  if(existing) {
    if(existing.text !== question.text || existing.followUp !== question.followUp) throw new Error(`既存IDと内容が異なります: ${question.id}`);
    continue;
  }
  const { source: original, ...record } = question;
  const contentSha256 = createHash('sha256').update(JSON.stringify([question.text,question.followUp])).digest('hex');
  data.questions.push({...record,source:{kind:'user-provided',stage:'provided-draft',importedAt,contentSha256,original},reviewStatus:'pending'});
  added += 1;
}
const legacyQuestions = ['couples','family','friends','self-care'].flatMap(series=>{
 const d=JSON.parse(readFileSync(resolve(root,`shared/questions/${series}.json`),'utf8'));
 return Array.isArray(d)?d:d.questions;
});
const report = validateDataset(data,{series:'adults',legacyQuestions});
const errors = report.issues.filter(issue=>issue.severity === 'error');
if(errors.length) { for(const issue of errors) console.error(issue.message); process.exit(1); }
if(readFileSync(path,'utf8') !== before) throw new Error('取り込み中に元ファイルが変更されたため中止しました。');
const temporary = `${path}.import-tmp`;
try { writeFileSync(temporary,`${JSON.stringify(data,null,2)}\n`); renameSync(temporary,path); }
finally { try { unlinkSync(temporary); } catch(error) { if(error.code !== 'ENOENT') throw error; } }
console.log(`Adults: ${added}組を原文のまま取り込み / 合計${data.questions.length}組 / 公開状態とレビュー状態は維持`);
