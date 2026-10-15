#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mergeLegacyFollowUps } from '../shared/content-policy.mjs';
import { normalizeQuestionText, textSimilarity, hasUnsafeQuestionText } from './validate-grok-questions.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
export function validateFollowUpDataset(data, legacyQuestions, series) {
  const issues = [];
  try { mergeLegacyFollowUps(legacyQuestions, data, series, { allowDrafts: true }); }
  catch (error) { return { issues: [{ severity: 'error', message: error.message }], questionCount: 0 }; }
  const owners = new Map();
  const entries = Object.entries(data.questions);
  const mains = new Map(legacyQuestions.map(question => [question.id, question.text]));
  for (const [id, text] of entries) {
    const key = normalizeQuestionText(text);
    if (owners.has(key)) issues.push({ severity: 'error', message: `${id}: 深掘り質問が ${owners.get(key)} と重複しています。` });
    else owners.set(key, id);
    if (key === normalizeQuestionText(mains.get(id))) issues.push({ severity: 'error', message: `${id}: メイン質問と深掘り質問が同じです。` });
    if (hasUnsafeQuestionText(text)) issues.push({ severity: 'error', message: `${id}: 圧力や不適切な表現を検出しました。` });
  }
  for (let i = 0; i < entries.length; i += 1) {
    for (const [otherId, otherText] of entries.slice(i + 1)) {
      const [id, text] = entries[i];
      if (text.length < 18 || otherText.length < 18) continue;
      if (textSimilarity(text, otherText) >= .88 && normalizeQuestionText(text) !== normalizeQuestionText(otherText)) {
        issues.push({ severity: 'warning', message: `${id} / ${otherId}: 似た深掘り表現です。主質問との対応を確認してください。` });
      }
    }
  }
  return { issues, questionCount: entries.length };
}

function main() {
  let errors = 0;
  const owners = new Map();
  for (const series of ['couples', 'family', 'friends']) {
    const questions = JSON.parse(readFileSync(resolve(root, `shared/questions/${series}.json`), 'utf8'));
    const data = JSON.parse(readFileSync(resolve(root, `shared/followups/${series}.json`), 'utf8'));
    const report = validateFollowUpDataset(data, questions, series);
    for (const issue of report.issues) {
      console.log(`${issue.severity === 'error' ? '✗' : '!'} ${series}: ${issue.message}`);
      if (issue.severity === 'error') errors += 1;
    }
    for (const [id, text] of Object.entries(data.questions)) {
      const key = normalizeQuestionText(text);
      if (owners.has(key)) { console.error(`✗ シリーズ間の深掘り重複: ${owners.get(key)} / ${series}/${id}`); errors += 1; }
      else owners.set(key, `${series}/${id}`);
    }
    console.log(`${series}: ${report.questionCount}/${questions.length} 組 / review=${data.reviewStatus}`);
  }
  for (const series of ['adults', 'self-care']) {
    const data = JSON.parse(readFileSync(resolve(root, `shared/questions/${series}.json`), 'utf8'));
    for (const question of data.questions) {
      const key = normalizeQuestionText(question.followUp);
      if (owners.has(key)) { console.error(`✗ シリーズ間の深掘り重複: ${owners.get(key)} / ${series}/${question.id}`); errors += 1; }
      else owners.set(key, `${series}/${question.id}`);
    }
    console.log(`${series}: ${data.questions.length} 組の個別深掘り / 未承認データは公開対象外`);
  }
  console.log(`5シリーズの深掘り: ${owners.size}種類`);
  console.log(errors ? `FAIL: ${errors}件` : 'PASS: 既存質問への個別深掘り・作成元・レビュー状態が整合しています。');
  if (errors) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
