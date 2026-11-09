#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGameDataset } from '../us/deck.mjs';
import { US_CONTRACT } from './series-contracts.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const digest = value => createHash('sha256').update(value).digest('hex');
const normalize = text => text.normalize('NFKC').replace(/[\s\p{P}\p{S}]+/gu, '');

export function validateUsDataset(data, manifest, originals = { family: read('shared/questions/family.json'), friends: read('shared/questions/friends.json') }) {
  const issues = [];
  const fail = message => issues.push(message);
  try { assertGameDataset(data); } catch (error) { return [error.message]; }
  const release = manifest?.series?.us;
  if (!release || !['published', 'unpublished'].includes(release.status) || release.questionFile !== 'us.json' || data.publicationStatus !== release.status) fail('Usの公開設定が一致しません。');
  if (release?.status === 'unpublished' && (release.developmentPreview !== true || release.draftPreview !== true)) fail('Usの開発プレビュー設定を確認してください。');
  if (release?.status === 'published' && data.questions.some(question => question.reviewStatus !== 'approved')) fail('Usは未承認の改稿データを公開できません。');
  if (data.source?.kind !== 'codex' || data.source.stage !== 'editorial-adaptation' || !/^[a-f0-9]{40}$/.test(data.source.basedOnCommit || '')
      || !/^\d{4}-\d{2}-\d{2}$/.test(data.source.generatedAt || '')) fail('Usの改稿元・作成元の記録を確認してください。');
  if (data.questions.length !== US_CONTRACT.total) fail(`Usは${US_CONTRACT.total}問必要です（現在${data.questions.length}問）。`);
  const origins = new Set();
  const texts = new Map();
  const conditions = new Map();
  for (const question of data.questions) {
    const original = originals[question.audience]?.find(card => card.id === question.origin?.id);
    const key = `${question.audience}/${question.origin?.id}`;
    if (!original || question.origin?.series !== question.audience || question.origin?.textSha256 !== digest(original?.text || '')) fail(`${question.id}: 元質問との対応・ハッシュが一致しません。`);
    if (origins.has(key)) fail(`${question.id}: 元質問の対応が重複しています。`);
    origins.add(key);
    if (original && (question.level !== original.level || question.category !== original.category)) fail(`${question.id}: 元のLevel・カテゴリが一致しません。`);
    const text = normalize(question.prompt);
    if (texts.has(text)) fail(`${question.id}: 問いが${texts.get(text)}と重複しています。`);
    texts.set(text, question.id);
    const condition = normalize(question.condition);
    if (conditions.has(condition)) fail(`${question.id}: 条件変更が${conditions.get(condition)}と重複しています。`);
    conditions.set(condition, question.id);
    if ([...question.prompt].length > 100 || question.options.some(option => [...option.text].length > 32) || [...question.condition].length > 120) fail(`${question.id}: スマホ表示用の文面が長すぎます。`);
    if (normalize(question.prompt) === condition) fail(`${question.id}: 条件変更が問いと同じです。`);
  }
  for (const [series, count] of [['family', US_CONTRACT.family], ['friends', US_CONTRACT.friends]]) {
    if (data.questions.filter(question => question.audience === series).length !== count) fail(`${series}: 改稿後の件数が${count}問ではありません。`);
    for (const original of originals[series]) if (!origins.has(`${series}/${original.id}`)) fail(`${series}/${original.id}: 改稿がありません。`);
  }
  return issues;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = read('shared/questions/us.json');
  const issues = validateUsDataset(data, read('shared/series-manifest.json'));
  if (issues.length) { issues.forEach(issue => console.error(`FAIL: ${issue}`)); process.exitCode = 1; }
  else console.log('PASS: Us 316問（家族166・友人150）— 1対1の原文対応、3選択肢、個別の条件変更、公開ゲート');
}
