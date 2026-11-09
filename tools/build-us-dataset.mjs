#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGameDataset } from '../us/deck.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function readEdits(text, count) {
  const edits = new Map();
  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim() || line.startsWith('#')) continue;
    const fields = line.split('|').map(field => field.trim());
    const index = Number(fields[0]);
    if (fields.length !== 6 || fields.some(field => !field) || !Number.isInteger(index) || index < 1 || index > count || edits.has(index)) {
      throw new Error(`改稿表の${lineIndex + 1}行目の対応・項目を確認してください。`);
    }
    const authored = value => value.replaceAll('\\n', '\n');
    edits.set(index, { prompt: authored(fields[1]), options: fields.slice(2, 5).map((text, i) => ({ id: String(i + 1), text: authored(text) })), condition: authored(fields[5]) });
  }
  if (edits.size !== count) throw new Error(`改稿表は${count}問必要です（現在${edits.size}問）。`);
  return edits;
}

export function buildUsDataset() {
  const contract = JSON.parse(readFileSync(resolve(root, 'tools/us-edits/source-contract.json'), 'utf8'));
  const questions = [];
  for (const [audience, source] of Object.entries(contract.series)) {
    const raw = readFileSync(resolve(root, `shared/questions/${audience}.json`), 'utf8');
    if (sha256(raw) !== source.fileSha256) throw new Error(`${audience}: 元データが保存時点と違います。改稿表の番号対応を再確認してください。`);
    const originals = JSON.parse(raw);
    if (originals.length !== source.total) throw new Error(`${audience}: 元データの件数が違います。`);
    const edits = readEdits(readFileSync(resolve(root, `tools/us-edits/${audience}.psv`), 'utf8'), source.total);
    originals.forEach((original, index) => {
      questions.push({
        id: `us-${audience}-${String(index + 1).padStart(3, '0')}`,
        audience, category: original.category, level: original.level,
        origin: { series: audience, id: original.id, textSha256: sha256(original.text) },
        ...edits.get(index + 1), reviewStatus: 'pending',
      });
    });
  }
  const dataset = {
    schemaVersion: 1, series: 'us', publicationStatus: 'unpublished',
    source: { kind: 'codex', stage: 'editorial-adaptation', generatedAt: contract.generatedAt, basedOnCommit: contract.commit },
    questions,
  };
  assertGameDataset(dataset);
  return dataset;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(root, 'shared/questions/us.json');
  const content = `${JSON.stringify(buildUsDataset(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== content) throw new Error('UsのJSONが改稿記録と一致しません。再生成して差分を確認してください。');
    console.log('PASS: Us 316問 — 改稿記録・原文・生成データが一致');
  } else {
    writeFileSync(output, content);
    console.log('Us 316問を生成しました。公開・レビュー状態は未承認のままです。');
  }
}
