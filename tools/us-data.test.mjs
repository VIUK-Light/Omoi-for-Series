import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUsDataset, readEdits } from './build-us-dataset.mjs';
import { validateUsDataset } from './verify-us-dataset.mjs';
import { playableCards } from '../us/deck.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const data = read('shared/questions/us.json');
const manifest = read('shared/series-manifest.json');

test('all 316 individual game adaptations reproduce exactly from the preserved source and editorial records', () => {
  assert.deepEqual(buildUsDataset(), data);
  assert.deepEqual(validateUsDataset(data, manifest), []);
  assert.equal(data.questions.filter(card => card.audience === 'family').length, 166);
  assert.equal(data.questions.filter(card => card.audience === 'friends').length, 150);
  assert.equal(new Set(data.questions.map(card => `${card.origin.series}/${card.origin.id}`)).size, 316);
  assert.ok(data.questions.every(card => card.reviewStatus === 'pending'));
});

test('adaptation tables reject missing rows, duplicate origins and incomplete choices instead of generating filler', () => {
  const row = '1|問い|選択1|選択2|選択3|追加条件';
  assert.equal(readEdits(row, 1).size, 1);
  assert.equal(readEdits('1|最初。\\n次の文。|選択1|選択2|選択3|条件の文。', 1).get(1).prompt, '最初。\n次の文。');
  assert.throws(() => readEdits(row, 2), /2問/u);
  assert.throws(() => readEdits(`${row}\n${row}`, 1), /対応/u);
  assert.throws(() => readEdits('1|問い|選択1|選択2||追加条件', 1), /対応/u);
});

test('draft play is local-only, explicit, and cannot leak pending adaptations into a published release', () => {
  const release = manifest.series.us;
  for (const hostname of ['localhost', '127.0.0.1', '::1']) {
    const result = playableCards(data, release, { protocol: 'http:', hostname });
    assert.equal(result.cards.length, 316);
  }
  for (const hostname of ['omoi-for.viuk-light.org', '127.0.0.1.example.com']) {
    assert.equal(playableCards(data, release, { protocol: 'https:', hostname }).available, false);
  }
  assert.equal(playableCards(data, { ...release, draftPreview: false }, { protocol: 'http:', hostname: 'localhost' }).cards.length, 0);
  const published = { ...data, publicationStatus: 'published' };
  const publishedManifest = structuredClone(manifest); publishedManifest.series.us.status = 'published';
  assert.ok(validateUsDataset(published, publishedManifest).some(issue => issue.includes('未承認')));
  assert.equal(playableCards(published, publishedManifest.series.us, { protocol: 'https:', hostname: 'omoi-for.viuk-light.org' }).cards.length, 0);
});

test('drifted origins, lost cards and malformed or repeated options are detected', () => {
  for (const alter of [
    value => { value.questions.pop(); },
    value => { value.questions[0].origin.textSha256 = '0'.repeat(64); },
    value => { value.questions[1].origin = value.questions[0].origin; },
    value => { value.questions[0].options[1].text = value.questions[0].options[0].text; },
    value => { value.questions[0].options[0].id = '4'; },
    value => { value.questions[1].condition = value.questions[0].condition; },
  ]) {
    const changed = structuredClone(data); alter(changed);
    assert.ok(validateUsDataset(changed, manifest).length > 0);
  }
});

test('retired routes keep explicit matching Us links without loading the old question app', () => {
  for (const series of ['family', 'friends']) {
    assert.equal(manifest.series[series].status, 'archived');
    assert.equal(manifest.series[series].replacement, 'us');
    for (const filename of ['index.html', 'howto.html']) {
      const html = readFileSync(new URL(`../${series}/${filename}`, import.meta.url), 'utf8');
      assert.ok(html.includes(`../us/?deck=${series}`));
      assert.ok(!html.includes('shared/app.js'));
      assert.ok(html.includes('archive/family-friends-before-us-v3'));
    }
  }
});
