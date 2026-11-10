// All answers are choices for the current turn, never personality assessments.
export const STORAGE_KEY = 'omoi-for-us:game:v1';
export const GAME_VERSION = 2;
const SCREENS = ['question', 'answer', 'score', 'results'];
const signatureCache = new WeakMap();

export function catalogSignature(cards) {
  if (signatureCache.has(cards)) return signatureCache.get(cards);
  const text = JSON.stringify(cards.map(({ id, audience, prompt, options, condition }) => ({ id, audience, prompt, options, condition })));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0;
  const signature = `${cards.length}:${hash.toString(16)}`;
  signatureCache.set(cards, signature);
  return signature;
}

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function eligibleIds(cards, audience) {
  return cards.filter(card => card.audience === audience).map(card => card.id);
}

export function nextPlayerName(names) {
  const used = new Set(names.map((name, index) => name.trim() || `プレイヤー${index + 1}`));
  let number = 1;
  while (used.has(`プレイヤー${number}`)) number++;
  return `プレイヤー${number}`;
}

export function createGame({ names, audience }, cards, random = Math.random) {
  if (!['family', 'friends'].includes(audience)) throw new Error('家族用か友人用を選んでください。');
  if (!Array.isArray(names) || names.length < 2 || names.length > 6) throw new Error('参加者は2〜6人で設定してください。');
  const players = names.map((name, index) => {
    const label = typeof name === 'string' ? name.trim() : '';
    if ([...label].length > 16) throw new Error('名前は16文字以内で入力してください。');
    return { id: `p${index + 1}`, name: label || `プレイヤー${index + 1}` };
  });
  if (new Set(players.map(player => player.name)).size !== players.length) throw new Error('区別できるよう、参加者の名前を変えてください。');
  const deck = shuffled(eligibleIds(cards, audience), random);
  if (!deck.length) throw new Error('この種類の問いがありません。');
  return {
    version: GAME_VERSION, catalog: catalogSignature(cards), audience, players,
    screen: 'question', stage: 'base', turnIndex: 0,
    questionId: deck[0], remainingIds: deck.slice(1), usedIds: [deck[0]],
    answer: null, baseAnswer: null, correctIds: [], turnAwards: { base: [], changed: [] },
    completedTurns: [], endedEarly: false,
  };
}

export function mainPlayer(state) { return state.players[state.turnIndex]; }
export function currentCard(state, cards) { return cards.find(card => card.id === state.questionId); }

function nextCard(state, cards, random) {
  let remaining = [...state.remainingIds];
  let used = [...state.usedIds];
  if (!remaining.length) {
    const ids = eligibleIds(cards, state.audience);
    remaining = shuffled(ids.filter(id => id !== state.questionId), random);
    if (!remaining.length) remaining = ids;
    used = ids.length > 1 ? [state.questionId] : [];
  }
  const questionId = remaining.shift();
  return {
    ...state, questionId, remainingIds: remaining, usedIds: [...used, questionId],
    screen: 'question', stage: 'base', answer: null, baseAnswer: null, correctIds: [],
    turnAwards: { base: [], changed: [] },
  };
}

// Invalid or repeated actions return the same object. A phase can award points
// only when leaving its score screen; checked participants are a set, not taps.
export function advanceGame(state, action, cards, random = Math.random) {
  if (!state || !action || state.screen === 'results') return state;
  const next = structuredClone(state);
  switch (action.type) {
    case 'ANSWER': {
      if (!['question', 'answer'].includes(state.screen) || !currentCard(state, cards)?.options.some(option => option.id === action.choice)) return state;
      next.answer = action.choice;
      next.correctIds = [];
      next.screen = 'score';
      return next;
    }
    case 'EDIT_ANSWER':
      if (state.screen !== 'score') return state;
      next.screen = 'answer';
      next.correctIds = [];
      return next;
    case 'TOGGLE_CORRECT':
      if (state.screen !== 'score' || action.playerId === mainPlayer(state).id || !state.players.some(player => player.id === action.playerId)) return state;
      next.correctIds = state.correctIds.includes(action.playerId)
        ? state.correctIds.filter(id => id !== action.playerId)
        : [...state.correctIds, action.playerId];
      return next;
    case 'TOGGLE_ALL_CORRECT': {
      if (state.screen !== 'score') return state;
      const ids = state.players.filter(player => player.id !== mainPlayer(state).id).map(player => player.id);
      next.correctIds = ids.every(id => state.correctIds.includes(id)) ? [] : ids;
      return next;
    }
    case 'ADVANCE':
      if (state.screen !== 'score') return state;
      next.turnAwards[state.stage] = [...state.correctIds];
      if (state.stage === 'base') {
        next.baseAnswer = state.answer;
        next.stage = 'changed';
        next.screen = 'question';
        next.answer = null;
        next.correctIds = [];
        return next;
      }
      next.completedTurns.push({ playerId: mainPlayer(state).id, questionId: state.questionId, awards: next.turnAwards, answerChanged: state.baseAnswer !== state.answer });
      next.turnAwards = { base: [], changed: [] };
      next.answer = null;
      next.baseAnswer = null;
      next.correctIds = [];
      if (state.turnIndex + 1 === state.players.length) {
        next.screen = 'results';
        return next;
      }
      next.turnIndex++;
      return nextCard(next, cards, random);
    case 'PASS':
      // Both phases belong to one question. Discard its awards together, so a
      // redraw cannot give the same player extra scoring opportunities.
      return nextCard(next, cards, random);
    case 'FINISH':
      next.screen = 'results';
      next.endedEarly = true;
      next.answer = null;
      next.baseAnswer = null;
      next.correctIds = [];
      next.turnAwards = { base: [], changed: [] };
      return next;
    default:
      return state;
  }
}

export function scoreTotals(state) {
  const scores = new Map(state.players.map(player => [player.id, 0]));
  for (const turn of state.completedTurns) {
    for (const stage of ['base', 'changed']) {
      for (const id of turn.awards[stage]) scores.set(id, scores.get(id) + 1);
    }
  }
  return state.players.map(player => ({ ...player, score: scores.get(player.id) }));
}

export function rankings(state) {
  const rows = scoreTotals(state).sort((a, b) => b.score - a.score);
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.score !== rows[index - 1].score) rank = index + 1;
    return { ...row, rank };
  });
}

export function restoreGame(serialized, cards) {
  try {
    const state = JSON.parse(serialized);
    if (!state || state.version !== GAME_VERSION || state.catalog !== catalogSignature(cards)) return null;
    if (!['family', 'friends'].includes(state.audience) || !SCREENS.includes(state.screen) || !['base', 'changed'].includes(state.stage)) return null;
    if (!Array.isArray(state.players) || state.players.length < 2 || state.players.length > 6) return null;
    if (state.players.some((player, index) => player?.id !== `p${index + 1}` || typeof player.name !== 'string' || !player.name.trim() || [...player.name].length > 16)) return null;
    if (new Set(state.players.map(player => player.name)).size !== state.players.length) return null;
    if (!Number.isInteger(state.turnIndex) || state.turnIndex < 0 || state.turnIndex >= state.players.length || typeof state.endedEarly !== 'boolean') return null;
    const pool = new Set(eligibleIds(cards, state.audience));
    const validCards = ids => Array.isArray(ids) && new Set(ids).size === ids.length && ids.every(id => pool.has(id));
    if (!pool.has(state.questionId) || !validCards(state.remainingIds) || !validCards(state.usedIds) || !state.usedIds.includes(state.questionId)) return null;
    if (state.remainingIds.some(id => state.usedIds.includes(id)) || state.remainingIds.length + state.usedIds.length !== pool.size) return null;
    if (!Array.isArray(state.completedTurns) || state.completedTurns.length > state.players.length) return null;
    const validPlayers = (ids, mainId) => Array.isArray(ids) && new Set(ids).size === ids.length
      && ids.every(id => id !== mainId && state.players.some(player => player.id === id));
    const validAwards = (awards, mainId) => awards && validPlayers(awards.base, mainId) && validPlayers(awards.changed, mainId);
    if (state.completedTurns.some((turn, index) => !turn || turn.playerId !== state.players[index].id || !pool.has(turn.questionId) || !validAwards(turn.awards, turn.playerId) || typeof turn.answerChanged !== 'boolean')) return null;
    const mainId = mainPlayer(state).id;
    if (!validPlayers(state.correctIds, mainId) || !validAwards(state.turnAwards, mainId)) return null;
    if (state.answer !== null && !currentCard(state, cards).options.some(option => option.id === state.answer)) return null;
    if (state.baseAnswer !== null && !currentCard(state, cards).options.some(option => option.id === state.baseAnswer)) return null;
    if (state.stage === 'base' && state.baseAnswer !== null) return null;
    if (state.stage === 'changed' && state.screen !== 'results' && state.baseAnswer === null) return null;
    if (state.screen === 'score' && state.answer === null) return null;
    if (state.screen === 'question' && state.answer !== null) return null;
    if (state.screen !== 'score' && state.correctIds.length) return null;
    if (state.turnAwards.changed.length || (state.stage === 'base' && state.turnAwards.base.length)) return null;
    if (state.screen === 'results') {
      const expected = state.endedEarly ? state.turnIndex : state.players.length;
      if (state.completedTurns.length !== expected || state.turnAwards.base.length || state.answer !== null || state.baseAnswer !== null) return null;
    } else if (state.endedEarly || state.completedTurns.length !== state.turnIndex) return null;
    return state;
  } catch {
    return null;
  }
}
