import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceGame, mainPlayer, scoreTotals, rankings, restoreGame, nextPlayerName } from '../us/game-engine.mjs';

const cards = ['family', 'friends'].flatMap(audience => Array.from({ length: 8 }, (_, index) => ({
  id: `${audience}-${index}`, audience, prompt: `${audience}の問い${index}`, condition: `追加条件${index}`,
  options: [{ id: '1', text: 'ひとつ目' }, { id: '2', text: 'ふたつ目' }, { id: '3', text: 'みっつ目' }],
})));
const fixed = () => .99;
const begin = (count = 4, audience = 'family', deck = cards) => createGame({ names: Array.from({ length: count }, (_, i) => `人${i + 1}`), audience }, deck, fixed);
function phase(state, selected = [], deck = cards) {
  let next = advanceGame(state, { type: 'ANSWER', choice: '2' }, deck);
  for (const playerId of selected) next = advanceGame(next, { type: 'TOGGLE_CORRECT', playerId }, deck);
  return advanceGame(next, { type: 'ADVANCE' }, deck, fixed);
}

for (const count of [2, 4, 6]) {
  test(`${count} people each get one turn, two predictions, and equal scoring opportunities`, () => {
    let state = begin(count);
    const seen = new Set();
    for (let turn = 0; turn < count; turn++) {
      assert.equal(mainPlayer(state).id, `p${turn + 1}`);
      assert.equal(state.stage, 'base');
      assert.ok(!seen.has(state.questionId)); seen.add(state.questionId);
      const questionId = state.questionId;
      const ids = state.players.filter(player => player.id !== mainPlayer(state).id).map(player => player.id);
      state = phase(state, ids);
      assert.equal(state.questionId, questionId);
      assert.equal(state.stage, 'changed');
      assert.equal(state.screen, 'question');
      assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
      state = phase(state, ids);
    }
    assert.equal(state.screen, 'results');
    assert.equal(state.endedEarly, false);
    assert.equal(state.completedTurns.length, count);
    assert.ok(scoreTotals(state).every(player => player.score === 2 * (count - 1)));
    assert.ok(rankings(state).every(player => player.rank === 1));
    assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
  });
}

test('no correct predictions still completes a round and all totals stay zero', () => {
  let state = begin(2);
  for (let index = 0; index < 4; index++) state = phase(state);
  assert.equal(state.screen, 'results');
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 0]);
});

test('answer and score actions are phase-bound and repeated next cannot double-count', () => {
  const initial = begin();
  assert.equal(advanceGame(initial, { type: 'ADVANCE' }, cards), initial);
  let state = initial;
  assert.equal(advanceGame(state, { type: 'ANSWER', choice: '9' }, cards), state);
  state = advanceGame(state, { type: 'ANSWER', choice: '1' }, cards);
  assert.equal(advanceGame(state, { type: 'ANSWER', choice: '2' }, cards), state);
  assert.equal(advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p1' }, cards), state);
  assert.equal(advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'unknown' }, cards), state);
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p2' }, cards);
  const changed = advanceGame(state, { type: 'ADVANCE' }, cards);
  assert.deepEqual(changed.turnAwards.base, ['p2']);
  assert.equal(advanceGame(changed, { type: 'ADVANCE' }, cards), changed);
  assert.equal(initial.screen, 'question');
  assert.deepEqual(initial.turnAwards.base, []);
});

test('scorers can be toggled off and editing an answer clears the draft checks', () => {
  let state = advanceGame(begin(), { type: 'ANSWER', choice: '2' }, cards);
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p2' }, cards);
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p2' }, cards);
  assert.deepEqual(state.correctIds, []);
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p3' }, cards);
  state = advanceGame(state, { type: 'EDIT_ANSWER' }, cards);
  assert.equal(state.screen, 'answer');
  assert.deepEqual(state.correctIds, []);
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
});

test('passing a changed question discards its base points but preserves earlier completed turns', () => {
  let state = phase(phase(begin(3), ['p2']), ['p2']);
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 2, 0]);
  state = phase(state, ['p1', 'p3']);
  const oldId = state.questionId;
  state = advanceGame(state, { type: 'PASS' }, cards, fixed);
  assert.notEqual(state.questionId, oldId);
  assert.equal(mainPlayer(state).id, 'p2');
  assert.equal(state.stage, 'base');
  assert.deepEqual(state.turnAwards, { base: [], changed: [] });
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 2, 0]);
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
});

test('a depleted deck redraws without an adjacent repeat and remains resumable', () => {
  const tiny = cards.filter(card => card.audience === 'family').slice(0, 2);
  let state = begin(2, 'family', tiny);
  for (let index = 0; index < 10; index++) {
    const oldId = state.questionId;
    state = advanceGame(state, { type: 'PASS' }, tiny, fixed);
    assert.notEqual(state.questionId, oldId);
    assert.deepEqual(restoreGame(JSON.stringify(state), tiny), state);
  }
  const single = tiny.slice(0, 1);
  state = advanceGame(begin(2, 'family', single), { type: 'PASS' }, single, fixed);
  assert.deepEqual(restoreGame(JSON.stringify(state), single), state);
});

test('early finish excludes the unfinished question and does not manufacture a completed turn', () => {
  let state = phase(phase(begin(3), ['p2']), ['p3']);
  state = phase(state, ['p1']);
  state = advanceGame(state, { type: 'FINISH' }, cards);
  assert.equal(state.screen, 'results');
  assert.equal(state.endedEarly, true);
  assert.equal(state.completedTurns.length, 1);
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 1, 1]);
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
  assert.equal(advanceGame(state, { type: 'ADVANCE' }, cards), state);
});

test('a fresh replay preserves settings and clears answers, awards and completed turns', () => {
  let state = phase(phase(begin(2, 'friends'), ['p2']), ['p2']);
  state = phase(phase(state, ['p1']), ['p1']);
  const fresh = createGame({ names: state.players.map(player => player.name), audience: state.audience }, cards, fixed);
  assert.equal(fresh.audience, 'friends');
  assert.deepEqual(fresh.players, state.players);
  assert.deepEqual(scoreTotals(fresh).map(player => player.score), [0, 0]);
  assert.equal(fresh.answer, null);
  assert.deepEqual(fresh.completedTurns, []);
});

test('session restoration rejects corrupt, stale and inconsistent score or player records', () => {
  const good = begin();
  for (const alter of [
    state => { state.version = 999; },
    state => { state.audience = 'adults'; },
    state => { state.players = []; },
    state => { state.players[1].id = 'p1'; },
    state => { state.questionId = 'missing'; },
    state => { state.remainingIds.push(state.questionId); },
    state => { state.turnAwards.base = ['p1']; },
    state => { state.correctIds = ['p2', 'p2']; },
    state => { state.turnIndex = .5; },
    state => { state.answer = '99'; },
    state => { state.screen = 'score'; },
    state => { state.completedTurns = [{ playerId: 'p1', questionId: state.questionId, awards: { base: ['p1'], changed: [] } }]; },
  ]) {
    const changed = structuredClone(good); alter(changed);
    assert.equal(restoreGame(JSON.stringify(changed), cards), null);
  }
  assert.equal(restoreGame('{bad json', cards), null);
  const revised = structuredClone(cards); revised[0].prompt += '改稿';
  assert.equal(restoreGame(JSON.stringify(good), revised), null);
});

test('setup limits participants and readable names, and empty names get player numbers', () => {
  for (const count of [0, 1, 7]) assert.throws(() => begin(count), /2〜6人/u);
  assert.throws(() => createGame({ names: ['あ'.repeat(17), '人2'], audience: 'family' }, cards), /16文字/u);
  assert.throws(() => createGame({ names: ['同じ名前', '同じ名前'], audience: 'family' }, cards), /区別/u);
  const state = createGame({ names: [' ', '名前'], audience: 'family' }, cards);
  assert.equal(state.players[0].name, 'プレイヤー1');
  assert.ok(state.remainingIds.every(id => id.startsWith('family-')));
});

test('adding participants after deleting any middle row never creates a default name collision', () => {
  for (const count of [3, 4, 5, 6]) for (let removed = 0; removed < count; removed++) {
    const names = Array.from({ length: count }, (_, index) => `プレイヤー${index + 1}`);
    names.splice(removed, 1);
    names.push(nextPlayerName(names));
    assert.equal(new Set(names).size, count);
    assert.doesNotThrow(() => createGame({ names, audience: 'family' }, cards));
  }
  assert.equal(nextPlayerName(['', 'プレイヤー2']), 'プレイヤー3');
  assert.equal(nextPlayerName([' プレイヤー1 ', 'アキ']), 'プレイヤー2');
});

test('both answers survive the active question and only a change flag survives completion', () => {
  let state = advanceGame(begin(2), { type: 'ANSWER', choice: '1' }, cards);
  state = advanceGame(state, { type: 'ADVANCE' }, cards);
  assert.equal(state.baseAnswer, '1');
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
  state = advanceGame(state, { type: 'ANSWER', choice: '2' }, cards);
  assert.equal(state.baseAnswer, '1');
  assert.equal(state.answer, '2');
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
  const passed = advanceGame(state, { type: 'PASS' }, cards, fixed);
  assert.equal(passed.baseAnswer, null);
  const finished = advanceGame(state, { type: 'FINISH' }, cards);
  assert.equal(finished.baseAnswer, null);
  state = advanceGame(state, { type: 'ADVANCE' }, cards, fixed);
  assert.equal(state.completedTurns[0].answerChanged, true);
  assert.deepEqual(Object.keys(state.completedTurns[0]).sort(), ['answerChanged', 'awards', 'playerId', 'questionId']);
  assert.equal(state.baseAnswer, null);
  state = phase(phase(state));
  assert.equal(state.completedTurns[1].answerChanged, false);
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
});

test('six players can score everyone with 36 actions and nobody with 24, without scoring the main player', () => {
  for (const correct of [false, true]) {
    let state = begin(6), actions = 0;
    while (state.screen !== 'results') {
      state = advanceGame(state, { type: 'ANSWER', choice: '1' }, cards); actions++;
      if (correct) {
        state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards); actions++;
        assert.equal(state.correctIds.length, 5);
        assert.ok(!state.correctIds.includes(mainPlayer(state).id));
      }
      state = advanceGame(state, { type: 'ADVANCE' }, cards, fixed); actions++;
    }
    assert.equal(actions, correct ? 36 : 24);
    assert.ok(scoreTotals(state).every(player => player.score === (correct ? 10 : 0)));
  }
  let state = advanceGame(begin(), { type: 'ANSWER', choice: '1' }, cards);
  state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards);
  state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards);
  assert.deepEqual(state.correctIds, []);
});

test('restore rejects an unavailable first answer, an old version and invalid discovery flags', () => {
  const changed = phase(begin(2));
  for (const value of [null, '9', undefined]) {
    const state = structuredClone(changed); state.baseAnswer = value;
    assert.equal(restoreGame(JSON.stringify(state), cards), null);
  }
  const old = begin(); old.version = 1;
  assert.equal(restoreGame(JSON.stringify(old), cards), null);
  const completed = phase(changed); delete completed.completedTurns[0].answerChanged;
  assert.equal(restoreGame(JSON.stringify(completed), cards), null);
});
