import { createGame, advanceGame, currentCard, mainPlayer, rankings, scoreTotals, restoreGame, STORAGE_KEY } from './game-engine.mjs';
import { playableCards } from './deck.mjs';

const app = document.querySelector('#us-app');
const dialog = document.querySelector('#us-dialog');
const announcement = document.querySelector('#us-announcement');
const queryDeck = new URLSearchParams(location.search).get('deck');
let audience = queryDeck === 'friends' ? 'friends' : 'family';
let names = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'];
let cards = [];
let game = null;
let parkedGame = null;
let loadState = 'loading';
let loadError = '';
let setupError = '';
let notice = '';
let storageAvailable = true;

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
const minus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

function header(active = false) {
  return `<header class="us-header"><a class="us-brand" href="../">Omoi for Us</a>${active
    ? '<button class="us-text-button" data-action="finish" type="button">ここで終える</button>'
    : '<a class="us-text-link" href="howto.html">遊び方</a>'}</header>`;
}
function notices() { return notice ? `<p class="us-notice" role="status">${escape(notice)}</p>` : ''; }
function shell(content, active = false) { app.innerHTML = `${header(active)}<main id="us-main">${content}${notices()}</main>`; }
function primary(label, action, extra = '') { return `<button class="us-primary" data-action="${action}" type="button" ${extra}>${label}</button>`; }

function readSavedGame() {
  let saved;
  try { saved = sessionStorage.getItem(STORAGE_KEY); } catch { storageAvailable = false; return; }
  if (!saved) return;
  const restored = restoreGame(saved, cards);
  if (restored) {
    if (['family', 'friends'].includes(queryDeck) && restored.audience !== queryDeck) {
      parkedGame = restored;
      names = restored.players.map(player => player.name);
      const label = restored.audience === 'family' ? '家族用' : '友人用';
      notice = `${label}のゲームが残っています。前のゲームへ戻るか、新しいゲームをはじめられます。`;
      return;
    }
    game = restored;
    audience = game.audience;
    names = game.players.map(player => player.name);
    notice = '前のゲームから再開しました。';
  } else {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { storageAvailable = false; }
    notice = '前のゲームを読み込めませんでした。新しくはじめられます。';
  }
}
function saveGame() {
  try {
    if (game) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    storageAvailable = false;
  }
  if (!storageAvailable && game) notice = 'このブラウザでは、再読み込みするとゲームが終了します。';
}

function setup() {
  const decks = [['family', '家族'], ['friends', '友人']].map(([value, label]) => `<button class="us-deck" type="button" data-deck="${value}" aria-pressed="${audience === value}">${audience === value ? check : ''}${label}</button>`).join('');
  const roster = names.map((name, index) => `<div class="us-name-row"><label class="us-number" for="us-name-${index}"><span aria-hidden="true">${index + 1}</span><span class="us-sr-only">参加者${index + 1}の名前</span></label><input id="us-name-${index}" data-name-index="${index}" value="${escape(name)}" maxlength="32" autocomplete="off" aria-describedby="us-name-help"><button class="us-icon-button" data-action="remove-player" data-index="${index}" type="button" aria-label="参加者${index + 1}を外す" ${names.length <= 2 ? 'disabled' : ''}>${minus}</button></div>`).join('');
  shell(`<h1 class="us-hero-title" tabindex="-1">知っているつもりの、<br><span>あなたへ。</span></h1><p class="us-intro">相手の選択を予想して、<br>まだ知らない一面に出会う。</p>
    <fieldset class="us-fieldset"><legend>誰と遊ぶ？</legend><div class="us-decks">${decks}</div></fieldset>
    <section class="us-fieldset" aria-labelledby="us-players-heading"><h2 class="us-section-title" id="us-players-heading">参加する人</h2><div class="us-roster">${roster}</div><button class="us-add" type="button" data-action="add-player" ${names.length >= 6 ? 'disabled' : ''}>${plus}人を追加</button><p class="us-sr-only" id="us-name-help">名前は16文字以内。空欄の場合はプレイヤー番号を使います。</p></section>
    <p class="us-helper">2〜6人・スマホ1台</p>${setupError ? `<p class="us-error" role="alert">${escape(setupError)}</p>` : ''}<div class="us-start">${primary('はじめる', 'start')}</div>${parkedGame ? '<div class="us-actions"><button class="us-secondary" data-action="resume" type="button">前のゲームへ戻る</button></div>' : ''}`);
}

function progress() {
  return `<p class="us-progress"><span>${game.turnIndex + 1} / ${game.players.length} 人目</span><span>${escape(mainPlayer(game).name)}の番</span></p>`;
}
function condition(card) {
  return game.stage === 'changed' ? `<aside class="us-condition" aria-labelledby="us-condition-title"><h2 id="us-condition-title">条件が変わったら？</h2><p>${escape(card.condition)}</p></aside>` : '';
}
function questionCard(card, choosing = false) {
  const options = card.options.map(option => {
    const content = `<span class="us-choice-number">${option.id}</span><span class="us-option-text">${escape(option.text)}</span>`;
    return `<li>${choosing ? `<button class="us-option" data-choice="${option.id}" type="button">${content}</button>` : `<div class="us-option">${content}</div>`}</li>`;
  }).join('');
  return `<article class="us-question" data-question-id="${escape(card.id)}"><h1 tabindex="-1">${escape(card.prompt)}</h1><ol class="us-options" aria-label="3つの選択肢">${options}</ol></article>`;
}
function questionScreen() {
  const card = currentCard(game, cards);
  const choosing = game.screen === 'answer';
  const instruction = choosing
    ? `${escape(mainPlayer(game).name)}さん、答えを選んでください。`
    : game.stage === 'changed' ? 'もう一度、指で一斉に予想！' : '主役は心の中で決めて、みんなは指で一斉に予想！';
  shell(`${progress()}${questionCard(card, choosing)}${condition(card)}<p class="us-instruction">${instruction}</p>
    <div class="us-actions">${choosing ? '<button class="us-secondary" data-action="back-to-question" type="button">問いに戻る</button>' : primary('主役の答えへ', 'open-answer')}
    <button class="us-text-button" data-action="pass" type="button">この問いをパス</button></div>`, true);
}
function scoreScreen() {
  const card = currentCard(game, cards);
  const answer = card.options.find(option => option.id === game.answer);
  const person = mainPlayer(game);
  const scorers = game.players.filter(player => player.id !== person.id).map(player => {
    const selected = game.correctIds.includes(player.id);
    return `<button class="us-scorer" data-player-id="${player.id}" type="button" aria-pressed="${selected}"><span class="us-checkbox" aria-hidden="true">${selected ? check : ''}</span><span class="us-scorer-name">${escape(player.name)}</span>${selected ? '<span class="us-point" aria-hidden="true">+1</span>' : ''}</button>`;
  }).join('');
  const next = game.stage === 'base' ? '条件変更へ' : game.turnIndex + 1 === game.players.length ? '結果を見る' : '次の人へ';
  const conditionReference = game.stage === 'changed' ? `<details class="us-condition-reference"><summary>追加された条件を見る</summary><p>${escape(card.condition)}</p></details>` : '';
  shell(`<h1 class="us-score-title" tabindex="-1">${escape(person.name)}の答え</h1><button class="us-revealed" data-action="edit-answer" type="button" aria-label="答えを選び直す" aria-describedby="us-revealed-text"><span class="us-choice-number">${answer.id}</span><span id="us-revealed-text" class="us-option-text">${escape(answer.text)}</span><svg class="us-answer-edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
    <p class="us-question-reference">問い：${escape(card.prompt)}</p>${conditionReference}<p class="us-reason">そう選んだ理由を話してみよう。</p>
    <section aria-labelledby="us-scorers-heading"><h2 id="us-scorers-heading" class="us-score-label">当たった人を選ぶ</h2><div class="us-scorers">${scorers}</div></section>
    <div class="us-actions">${primary(next, 'advance')}<p class="us-helper">得点は次へ進むと確定します。</p><button class="us-text-button" data-action="pass" type="button">この問いをパス</button></div>`, true);
}
function results() {
  const rows = game.endedEarly ? scoreTotals(game) : rankings(game);
  const ranking = rows.map(row => `<li class="us-rank-row${!game.endedEarly && row.rank === 1 ? ' is-first' : ''}">${!game.endedEarly ? `<span class="us-rank">${row.rank}位</span>` : ''}<span class="us-rank-name">${escape(row.name)}</span><span class="us-rank-score">${row.score}点</span></li>`).join('');
  shell(`<h1 class="us-page-title" tabindex="-1">${game.endedEarly ? 'ここまでの結果' : '今回の結果'}</h1><p class="us-intro">${game.endedEarly ? `${game.completedTurns.length}人の番を終えました。` : 'みんなの、意外な一面は見つかった？'}</p>${game.endedEarly ? '<p class="us-helper">途中終了のため、順位は付けていません。</p>' : ''}
    <ol class="us-rank-list" aria-label="得点">${ranking}</ol><div class="us-actions">${primary('もう一度', 'again')}<button class="us-secondary" data-action="setup" type="button">メンバー・種類を変える</button></div>`);
}

function render(moveFocus = false) {
  app.setAttribute('aria-busy', String(loadState === 'loading'));
  if (loadState === 'loading') shell('<h1 class="us-page-title" tabindex="-1">問いを読み込んでいます。</h1>');
  else if (loadState === 'unpublished') shell('<h1 class="us-page-title" tabindex="-1">公開準備中です。</h1><p class="us-intro">Omoi for Usは、ただいま公開に向けて準備しています。</p><div class="us-actions"><a class="us-secondary" href="../">シリーズ一覧へ</a></div>');
  else if (loadState === 'error') shell(`<h1 class="us-page-title" tabindex="-1">問いを読み込めませんでした。</h1><p class="us-error" role="alert">${escape(loadError)}</p><div class="us-actions">${primary('もう一度読み込む', 'retry')}</div>`);
  else if (!game) setup();
  else if (game.screen === 'results') results();
  else if (game.screen === 'score') scoreScreen();
  else questionScreen();
  if (moveFocus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    app.querySelector('h1')?.focus({ preventScroll: true });
  }
}

function act(action) {
  const next = advanceGame(game, action, cards);
  if (next === game) return;
  const passedAwards = action.type === 'PASS' && game.turnAwards.base.length;
  game = next;
  notice = '';
  saveGame();
  render(true);
  if (action.type === 'PASS') announcement.textContent = passedAwards ? '問いを替えました。この問いの得点は取り消しました。' : '同じ主役で、新しい問いを引きました。';
}

app.addEventListener('input', event => {
  const input = event.target.closest('[data-name-index]');
  if (input && !game) names[Number(input.dataset.nameIndex)] = input.value;
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || (!app.contains(button) && !dialog.contains(button))) return;
  if (button.dataset.deck && !game) { audience = button.dataset.deck; setupError = ''; render(); app.querySelector(`[data-deck="${audience}"]`)?.focus({ preventScroll: true }); return; }
  if (button.dataset.choice && game) { act({ type: 'ANSWER', choice: button.dataset.choice }); return; }
  if (button.dataset.playerId && game) {
    const scroll = window.scrollY;
    const playerId = button.dataset.playerId;
    const next = advanceGame(game, { type: 'TOGGLE_CORRECT', playerId }, cards);
    if (next === game) return;
    game = next; saveGame(); render();
    app.querySelector(`[data-player-id="${playerId}"]`)?.focus({ preventScroll: true });
    window.scrollTo({ top: scroll, behavior: 'instant' });
    return;
  }
  switch (button.dataset.action) {
    case 'add-player':
      if (!game && names.length < 6) { names.push(`プレイヤー${names.length + 1}`); render(); app.querySelector(`[data-name-index="${names.length - 1}"]`)?.focus(); }
      break;
    case 'remove-player':
      if (!game && names.length > 2) { names.splice(Number(button.dataset.index), 1); render(); app.querySelector('[data-action="add-player"]')?.focus(); }
      break;
    case 'start':
    case 'again':
      if (loadState !== 'ready' || (game && game.screen !== 'results')) break;
      try {
        game = createGame({ names, audience }, cards);
        parkedGame = null;
        const url = new URL(location.href); url.searchParams.set('deck', audience); history.replaceState(null, '', url);
        names = game.players.map(player => player.name);
        setupError = ''; notice = ''; saveGame(); render(true);
      } catch (error) { setupError = error.message; render(); }
      break;
    case 'setup':
      if (game?.screen === 'results') { game = null; parkedGame = null; notice = ''; saveGame(); render(true); }
      break;
    case 'resume':
      if (parkedGame && !game) {
        game = parkedGame; parkedGame = null; audience = game.audience;
        names = game.players.map(player => player.name);
        const url = new URL(location.href); url.searchParams.set('deck', audience); history.replaceState(null, '', url);
        notice = '前のゲームから再開しました。'; saveGame(); render(true);
      }
      break;
    case 'open-answer': act({ type: 'OPEN_ANSWER' }); break;
    case 'edit-answer': act({ type: 'EDIT_ANSWER' }); break;
    case 'back-to-question':
      if (game?.screen === 'answer') { game = { ...game, screen: 'question', answer: null }; saveGame(); render(true); }
      break;
    case 'advance': act({ type: 'ADVANCE' }); break;
    case 'pass': act({ type: 'PASS' }); break;
    case 'finish':
      if (game && game.screen !== 'results') dialog.showModal();
      break;
    case 'confirm-finish': dialog.close(); act({ type: 'FINISH' }); break;
    case 'cancel-finish': dialog.close(); break;
    case 'retry': load(); break;
  }
});

async function load() {
  loadState = 'loading'; render();
  try {
    const responses = await Promise.all([fetch('../shared/series-manifest.json', { cache: 'no-cache' }), fetch('../shared/questions/us.json', { cache: 'no-cache' })]);
    if (responses.some(response => !response.ok)) throw new Error('通信状態を確認して、もう一度お試しください。');
    const [manifest, data] = await Promise.all(responses.map(response => response.json()));
    const playable = playableCards(data, manifest.series?.us, location);
    if (!playable.available) { loadState = 'unpublished'; render(); return; }
    cards = playable.cards;
    if (!['family', 'friends'].every(deck => cards.some(card => card.audience === deck))) throw new Error('家族用・友人用の問いを準備しています。');
    readSavedGame();
    loadState = 'ready'; render();
  } catch (error) {
    loadState = 'error';
    loadError = error instanceof SyntaxError ? '質問データの形式を確認してください。' : error.message;
    render();
  }
}

load();
