import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advanceGame, mainPlayer, scoreTotals, rankings, restoreGame, nextPlayerName } from '../us/game-engine.mjs';

const cards = ['family', 'friends'].flatMap(audience => Array.from({ length: 8 }, (_, index) => ({
  id: `${audience}-${index}`, audience, prompt: `${audience}の問い${index}`, condition: `追加条件${index}`,
  options: [{ id: '1', text: 'ひとつ目' }, { id: '2', text: 'ふたつ目' }, { id: '3', text: 'みっつ目' }],
})));
const fixed = () => .99;
const begin = (count = 4, audience = 'family', deck = cards) => createGame({ names: Array.from({ length: count }, (_, i) => `人${i + 1}`), audience }, deck, fixed);
function reveal(state, deck = cards) {
  return advanceGame(advanceGame(state, { type: 'ANSWER', choice: '2' }, deck), { type: 'REVEAL' }, deck);
}
function complete(state, selected = [], deck = cards) {
  let next = reveal(state, deck);
  for (const playerId of selected) next = advanceGame(next, { type: 'TOGGLE_CORRECT', playerId }, deck);
  return advanceGame(next, { type: 'ADVANCE' }, deck, fixed);
}

for (const count of [2, 4, 6]) {
  test(`${count} people each get one private answer, one prediction and equal scoring opportunities`, () => {
    let state = begin(count);
    const seen = new Set();
    for (let turn = 0; turn < count; turn++) {
      assert.equal(mainPlayer(state).id, `p${turn + 1}`);
      assert.equal(state.screen, 'choose');
      assert.ok(!seen.has(state.questionId)); seen.add(state.questionId);
      const ids = state.players.filter(player => player.id !== mainPlayer(state).id).map(player => player.id);
      state = complete(state, ids);
      assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
    }
    assert.equal(state.screen, 'results');
    assert.equal(state.completedTurns.length, count);
    assert.ok(scoreTotals(state).every(player => player.score === count - 1));
    assert.ok(rankings(state).every(player => player.rank === 1));
  });
}

test('the committed answer survives reload and can only be reselected before reveal', () => {
  let state = advanceGame(begin(), { type: 'ANSWER', choice: '1' }, cards);
  assert.equal(state.screen, 'guess');
  assert.equal(state.answer, '1');
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
  assert.equal(advanceGame(state, { type: 'ANSWER', choice: '3' }, cards), state);
  state = advanceGame(state, { type: 'RESELECT' }, cards);
  assert.equal(state.screen, 'choose');
  assert.equal(state.answer, null);
  state = advanceGame(state, { type: 'ANSWER', choice: '3' }, cards);
  state = advanceGame(state, { type: 'REVEAL' }, cards);
  assert.equal(state.answer, '3');
  assert.equal(advanceGame(state, { type: 'RESELECT' }, cards), state);
  assert.equal(advanceGame(state, { type: 'ANSWER', choice: '1' }, cards), state);
});

test('points and conversation are unavailable before reveal, and repeated next never doubles points', () => {
  const initial = begin();
  for (const type of ['REVEAL', 'ADVANCE', 'TOGGLE_ALL_CORRECT', 'TOGGLE_CONDITION']) assert.equal(advanceGame(initial, { type }, cards), initial);
  assert.equal(advanceGame(initial, { type: 'ANSWER', choice: '9' }, cards), initial);
  const guess = advanceGame(initial, { type: 'ANSWER', choice: '1' }, cards);
  assert.equal(advanceGame(guess, { type: 'ADVANCE' }, cards), guess);
  assert.equal(advanceGame(guess, { type: 'TOGGLE_CORRECT', playerId: 'p2' }, cards), guess);
  let state = advanceGame(guess, { type: 'REVEAL' }, cards);
  assert.equal(advanceGame(state, { type: 'REVEAL' }, cards), state);
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p2' }, cards);
  state = advanceGame(state, { type: 'ADVANCE' }, cards, fixed);
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 1, 0, 0]);
  assert.equal(advanceGame(state, { type: 'ADVANCE' }, cards), state);
});

test('the optional condition can open and close without another answer or scoring opportunity', () => {
  let state = reveal(begin());
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p2' }, cards);
  for (let index = 0; index < 5; index++) {
    state = advanceGame(state, { type: 'TOGGLE_CONDITION' }, cards);
    assert.equal(state.screen, 'score');
    assert.equal(state.answer, '2');
    assert.deepEqual(state.correctIds, ['p2']);
    assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
    assert.equal(advanceGame(state, { type: 'ANSWER', choice: '1' }, cards), state);
  }
  state = advanceGame(state, { type: 'ADVANCE' }, cards, fixed);
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 1, 0, 0]);
  assert.equal(state.screen, 'choose');
  assert.equal(state.conditionOpen, false);
});

test('scorers exclude the main player and all-correct supports both selection and clearing', () => {
  let state = reveal(begin());
  assert.equal(advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p1' }, cards), state);
  assert.equal(advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'missing' }, cards), state);
  state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards);
  assert.deepEqual(state.correctIds, ['p2', 'p3', 'p4']);
  state = advanceGame(state, { type: 'TOGGLE_CORRECT', playerId: 'p3' }, cards);
  assert.deepEqual(state.correctIds, ['p2', 'p4']);
  state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards);
  state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards);
  assert.deepEqual(state.correctIds, []);
});

test('passing in private choice, prediction or score discards only the current turn', () => {
  const first = complete(begin(3), ['p2']);
  for (const prepare of [state => state, state => advanceGame(state, { type: 'ANSWER', choice: '1' }, cards), state => reveal(state)]) {
    let state = prepare(first);
    const oldId = state.questionId;
    state = advanceGame(state, { type: 'PASS' }, cards, fixed);
    assert.notEqual(state.questionId, oldId);
    assert.equal(mainPlayer(state).id, 'p2');
    assert.equal(state.screen, 'choose');
    assert.equal(state.answer, null);
    assert.deepEqual(state.correctIds, []);
    assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 1, 0]);
    assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
  }
});

test('a depleted pool rolls over without adjacent repetition and a single-card deck remains resumable', () => {
  for (const count of [1, 2]) {
    const deck = cards.filter(card => card.audience === 'family').slice(0, count);
    let state = begin(2, 'family', deck);
    for (let index = 0; index < 10; index++) {
      const oldId = state.questionId;
      state = advanceGame(state, { type: 'PASS' }, deck, fixed);
      if (count > 1) assert.notEqual(state.questionId, oldId);
      assert.deepEqual(restoreGame(JSON.stringify(state), deck), state);
    }
  }
});

test('early finish discards an uncompleted answer and scorers and gives no ranking', () => {
  let state = complete(begin(3), ['p2']);
  state = reveal(state);
  state = advanceGame(state, { type: 'TOGGLE_ALL_CORRECT' }, cards);
  state = advanceGame(state, { type: 'FINISH' }, cards);
  assert.equal(state.endedEarly, true);
  assert.equal(state.answer, null);
  assert.deepEqual(state.correctIds, []);
  assert.equal(state.completedTurns.length, 1);
  assert.deepEqual(scoreTotals(state).map(player => player.score), [0, 1, 0]);
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
});

test('completed turns retain only player, question and scorer IDs, never the selected answer', () => {
  const state = complete(begin(2), ['p2']);
  assert.deepEqual(Object.keys(state.completedTurns[0]).sort(), ['correctIds', 'playerId', 'questionId']);
  assert.equal(state.answer, null);
  assert.deepEqual(restoreGame(JSON.stringify(state), cards), state);
});

test('six people finish in 24 clicks with all-correct or 18 with nobody scoring', () => {
  for (const correct of [false, true]) {
    let state = begin(6), actions = 0;
    while (state.screen !== 'results') {
      for (const action of [{ type: 'ANSWER', choice: '1' }, { type: 'REVEAL' }, ...(correct ? [{ type: 'TOGGLE_ALL_CORRECT' }] : []), { type: 'ADVANCE' }]) {
        state = advanceGame(state, action, cards, fixed); actions++;
      }
    }
    assert.equal(actions, correct ? 24 : 18);
    assert.ok(scoreTotals(state).every(player => player.score === (correct ? 5 : 0)));
  }
});

test('a replay preserves the people and deck and clears all progress', () => {
  let state = complete(complete(begin(2, 'friends'), ['p2']), ['p1']);
  const fresh = createGame({ names: state.players.map(player => player.name), audience: state.audience }, cards, fixed);
  assert.deepEqual(fresh.players, state.players);
  assert.equal(fresh.audience, 'friends');
  assert.equal(fresh.screen, 'choose');
  assert.equal(fresh.answer, null);
  assert.deepEqual(fresh.completedTurns, []);
});

test('restore rejects old versions and corrupt stage, pool, answer and score relationships', () => {
  const good = begin();
  for (const alter of [state => { state.version = 1; }, state => { state.version = 2; }, state => { state.audience = 'adults'; }, state => { state.players = []; }, state => { state.players[1].id = 'p1'; }, state => { state.questionId = 'missing'; }, state => { state.remainingIds.push(state.questionId); }, state => { state.turnIndex = .5; }, state => { state.answer = '1'; }, state => { state.screen = 'guess'; }, state => { state.correctIds = ['p2']; }, state => { state.conditionOpen = true; }]) {
    const bad = structuredClone(good); alter(bad);
    assert.equal(restoreGame(JSON.stringify(bad), cards), null);
  }
  assert.equal(restoreGame('{bad', cards), null);
  const revised = structuredClone(cards); revised[0].prompt += '改稿';
  assert.equal(restoreGame(JSON.stringify(good), revised), null);
  const completed = complete(good, ['p2']); completed.completedTurns[0].answer = '2';
  assert.equal(restoreGame(JSON.stringify(completed), cards), null);
});

test('adding after middle deletion always chooses an unused name including blank defaults', () => {
  for (const count of [3, 4, 5, 6]) for (let removed = 0; removed < count; removed++) {
    const names = Array.from({ length: count }, (_, index) => `プレイヤー${index + 1}`); names.splice(removed, 1); names.push(nextPlayerName(names));
    assert.equal(new Set(names).size, count);
    assert.doesNotThrow(() => createGame({ names, audience: 'family' }, cards));
  }
  assert.equal(nextPlayerName(['', 'プレイヤー2']), 'プレイヤー3');
});

test('setup validates people and names and supplies empty defaults', () => {
  for (const count of [0, 1, 7]) assert.throws(() => begin(count), /2〜6人/u);
  assert.throws(() => createGame({ names: ['あ'.repeat(17), '人2'], audience: 'family' }, cards), /16文字/u);
  assert.throws(() => createGame({ names: ['同じ', '同じ'], audience: 'family' }, cards), /区別/u);
  assert.equal(createGame({ names: [' ', '名前'], audience: 'family' }, cards).players[0].name, 'プレイヤー1');
});
