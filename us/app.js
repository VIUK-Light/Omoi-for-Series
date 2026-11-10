import { createGame, advanceGame, currentCard, mainPlayer, rankings, scoreTotals, restoreGame, nextPlayerName, totalTurns, DEFAULT_ROUNDS, STORAGE_KEY } from './game-engine.mjs?v=us-rounds-5';
import { playableCards } from './deck.mjs';
import { gameCardMarkup } from './card-view.mjs?v=us-rounds-5';
import { updateQuestionCardSide, focusQuestionCard } from '../shared/question-card.mjs';

const app = document.querySelector('#us-app');
const dialog = document.querySelector('#us-dialog');
const announcement = document.querySelector('#us-announcement');
const queryDeck = new URLSearchParams(location.search).get('deck');
let audience = queryDeck === 'friends' ? 'friends' : 'family';
let names = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'];
let rounds = DEFAULT_ROUNDS;
const INTRO_KEY = 'omoi-for-us:intro:v1';
let showIntro = true;
try { showIntro = sessionStorage.getItem(INTRO_KEY) !== 'true'; } catch { /* Show the introduction when storage is unavailable. */ }
let cards = [];
let game = null;
let parkedGame = null;
let loadState = 'loading';
let loadError = '';
let setupError = '';
let notice = '';
let storageAvailable = true;
let largeText = false;
try { largeText = sessionStorage.getItem('omoi-for-us:large-text') === 'true'; } catch { /* Use the default display when storage is unavailable. */ }

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
const minus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

function header(active = false) {
  const help = !game && !showIntro
    ? '<button class="us-text-button" data-action="show-intro" type="button">遊び方</button>'
    : `<a class="us-text-link" href="howto.html">${!game && showIntro ? '詳しい遊び方' : '遊び方'}</a>`;
  return `<header class="us-header"><a class="us-brand" href="../"><span class="brand-prefix">Omoi for</span> <span class="brand-target">Us</span></a>${active
    ? `<div class="us-header-actions"><button class="us-text-button" data-action="toggle-large-text" type="button" aria-pressed="${largeText}">${largeText ? '標準に戻す' : '大きく表示'}</button><button class="us-text-button" data-action="finish" type="button">ここで終える</button></div>`
    : help}</header>`;
}
function notices() { return notice ? `<p class="us-notice" role="status">${escape(notice)}</p>` : ''; }
function shell(content, active = false) {
  const previous = app.querySelector('#question-card');
  const template = document.createElement('template');
  template.innerHTML = `${header(active)}<main id="us-main"${active ? ' class="us-session"' : ''}>${content}${notices()}</main>`;
  const next = template.content.querySelector('#question-card');
  const sameCard = previous && next && previous.dataset.questionId === next.dataset.questionId;
  const wasRevealed = previous?.classList.contains('is-revealed');
  const reveal = next?.classList.contains('is-revealed');
  if (sameCard) {
    for (const side of ['front', 'back']) {
      const oldFace = previous.querySelector(`.question-card-${side}`);
      const newFace = next.querySelector(`.question-card-${side}`);
      oldFace.replaceChildren(...newFace.childNodes);
      oldFace.setAttribute('aria-label', newFace.getAttribute('aria-label'));
    }
    next.replaceWith(previous);
    updateQuestionCardSide(previous, wasRevealed);
  } else if (next) next.closest('.card-stage').classList.add('is-entering');
  app.classList.toggle('us-session-shell', active);
  app.classList.toggle('us-large-text', largeText);
  app.replaceChildren(template.content);
  if (sameCard) {
    // Keep the actual card and its 3D layer across state changes. Establish the
    // previous side before toggling so the shared flip transition can run.
    previous.getBoundingClientRect();
    updateQuestionCardSide(previous, reveal);
  }
}
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
      rounds = [1, 3, 5].includes(restored.initialRounds) ? restored.initialRounds : DEFAULT_ROUNDS;
      showIntro = false;
      const label = restored.audience === 'family' ? '家族用' : '友人用';
      notice = `${label}のゲームが残っています。前のゲームへ戻るか、新しいゲームをはじめられます。`;
      return;
    }
    game = restored;
    audience = game.audience;
    names = game.players.map(player => player.name);
    rounds = [1, 3, 5].includes(game.initialRounds) ? game.initialRounds : DEFAULT_ROUNDS;
    showIntro = false;
  } else {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { storageAvailable = false; }
    notice = '前のゲームを読み込めませんでした。内容の更新や保存状態の変更があったため、新しくはじめてください。';
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

function introduction() {
  shell(`<h1 class="us-page-title" tabindex="-1">遊び方</h1><p class="us-intro">相手の答えを、みんなで当てよう。<br>2〜6人・スマホ1台で遊べます。</p>
    <ol class="us-tutorial" role="list">
      <li><h2>主役が画面で答えを選ぶ</h2><p>画面を見るのは主役だけ。3択から選ぶと、答えは隠れます。</p></li>
      <li><h2>みんなで一斉に予想</h2><p>画面をみんなに見せて、主役以外が指や口頭で1・2・3を一斉に出します。</p></li>
      <li><h2>答えを公開して、当たった人に1点</h2><p>「答えを公開」で答え合わせ。なぜ選んだのかも話してみよう。</p></li>
      <li><h2>次の人へ交代、何周でも</h2><p>全員の番を終えたら1周。標準は3周で、長さはあとで選べます。</p></li>
    </ol><p class="us-helper us-tutorial-note">答え合わせの後は、条件を変えて話すおまけもあります。</p><div class="us-start">${primary('メンバーを決める', 'intro-next')}</div>`);
}

function setup() {
  const decks = [['family', '家族'], ['friends', '友人']].map(([value, label]) => `<button class="us-deck" type="button" data-deck="${value}" aria-pressed="${audience === value}">${audience === value ? check : ''}${label}</button>`).join('');
  const lengths = [1, 3, 5].map(value => `<button class="us-deck us-round" type="button" data-rounds="${value}" aria-pressed="${rounds === value}">${value}周</button>`).join('');
  const roster = names.map((name, index) => `<div class="us-name-row"><label class="us-number" for="us-name-${index}"><span aria-hidden="true">${index + 1}</span><span class="us-sr-only">参加者${index + 1}の名前</span></label><input id="us-name-${index}" data-name-index="${index}" value="${escape(name)}" maxlength="32" autocomplete="off" aria-describedby="us-name-help"><button class="us-icon-button" data-action="remove-player" data-index="${index}" type="button" aria-label="参加者${index + 1}を外す" ${names.length <= 2 ? 'disabled' : ''}>${minus}</button></div>`).join('');
  shell(`<h1 class="us-hero-title" tabindex="-1">知っているつもりの、<br><span>あなたへ。</span></h1><p class="us-intro">主役が画面で答えを選び、みんなが予想。<br>当たった人は1点。順番に交代して遊ぼう。</p>
    <fieldset class="us-fieldset"><legend>誰と遊ぶ？</legend><div class="us-decks">${decks}</div></fieldset>
    <section class="us-fieldset" aria-labelledby="us-players-heading"><h2 class="us-section-title" id="us-players-heading">参加する人</h2><div class="us-roster">${roster}</div><button class="us-add" type="button" data-action="add-player" ${names.length >= 6 ? 'disabled' : ''}>${plus}人を追加</button><p class="us-sr-only" id="us-name-help">名前は16文字以内。空欄の場合はプレイヤー番号を使います。</p></section>
    <fieldset class="us-fieldset"><legend>何周遊ぶ？</legend><div class="us-rounds" aria-describedby="us-rounds-help">${lengths}</div><p class="us-helper" id="us-rounds-help" aria-live="polite">1人${rounds}回ずつ主役・全${names.length * rounds}問</p></fieldset>
    <p class="us-helper">2〜6人・スマホ1台</p>${setupError ? `<p class="us-error" role="alert">${escape(setupError)}</p>` : ''}<div class="us-start">${primary('はじめる', 'start')}</div>${parkedGame ? '<div class="us-actions"><button class="us-secondary" data-action="resume" type="button">前のゲームへ戻る</button></div>' : ''}`);
}

function progress() {
  return `<p class="us-progress"><span>${Math.floor(game.turnIndex / game.players.length) + 1} / ${game.rounds} 周目</span><span>${game.turnIndex % game.players.length + 1} / ${game.players.length} 人目</span><span>${escape(mainPlayer(game).name)}の番</span></p>`;
}
function questionScreen() {
  const choosing = game.screen === 'choose';
  const instruction = choosing
    ? `<span>${escape(mainPlayer(game).name)}さんだけが画面を見て、</span><span>答えを1つ選んでください。選ぶと隠れます。</span>`
    : '<span>答えは決まりました。画面をみんなに見せて、</span><span>1・2・3で一斉に予想しましょう。</span>';
  shell(`${progress()}<p class="us-instruction">${instruction}</p>${gameCardMarkup(currentCard(game, cards), game, mainPlayer(game))}
    <div class="us-actions">${choosing ? '' : `${primary('答えを公開', 'reveal')}<p class="us-helper">全員の予想がそろったらタップしてください。</p><button class="us-text-button" data-action="reselect" type="button">予想の前に選び直す</button>`}
    <button class="us-text-button" data-action="pass" type="button">この問いをパス</button></div>`, true);
}
function scoreScreen() {
  const next = game.turnIndex + 1 === totalTurns(game) ? '結果を見る' : (game.turnIndex + 1) % game.players.length === 0 ? '次の周へ' : '次の人へ';
  shell(`${progress()}${gameCardMarkup(currentCard(game, cards), game, mainPlayer(game))}
    <div class="us-actions">${primary(next, 'advance')}<button class="us-text-button" data-action="toggle-condition" type="button">${game.conditionOpen ? '答えと得点に戻る' : 'この条件ならどう？（おまけ）'}</button><p class="us-helper">得点は次へ進むと確定します。</p><button class="us-text-button" data-action="pass" type="button">この問いをパス</button></div>`, true);
}
function results() {
  const rows = game.endedEarly ? scoreTotals(game) : rankings(game);
  const ranking = rows.map(row => `<li class="us-rank-row${!game.endedEarly && row.rank === 1 ? ' is-first' : ''}">${!game.endedEarly ? `<span class="us-rank">${row.rank}位</span>` : ''}<span class="us-rank-name">${escape(row.name)}</span><span class="us-rank-score">${row.score}点</span></li>`).join('');
  const questions = game.completedTurns.length ? `<section class="us-discoveries" aria-labelledby="us-discoveries-title"><h2 id="us-discoveries-title">今日の問い</h2><details><summary>問いを振り返る</summary><ul>${game.completedTurns.map(turn => `<li><strong>${escape(game.players.find(player => player.id === turn.playerId).name)}</strong><p>${escape(cards.find(card => card.id === turn.questionId).prompt)}</p></li>`).join('')}</ul></details></section>` : '';
  shell(`<h1 class="us-page-title" tabindex="-1">${game.endedEarly ? 'ここまでの結果' : '今回の結果'}</h1><p class="us-intro">${game.endedEarly ? `${game.completedTurns.length}問を終えました。` : `${game.rounds}周、全${game.completedTurns.length}問を遊びました。<br>みんなの、意外な一面は見つかった？`}</p>${game.endedEarly ? '<p class="us-helper">途中終了のため、順位は付けていません。</p>' : ''}
    <ol class="us-rank-list" aria-label="得点">${ranking}</ol>${questions}<div class="us-actions">${game.endedEarly ? primary('もう一度', 'again') : `${primary('得点を引き継いで、あと1周', 'continue')}<button class="us-secondary" data-action="again" type="button">得点を0にして、もう一度</button>`}<button class="us-text-button" data-action="setup" type="button">メンバー・種類・周回数を変える</button></div>`);
}

function render(moveFocus = false) {
  app.setAttribute('aria-busy', String(loadState === 'loading'));
  if (loadState === 'loading') shell('<h1 class="us-page-title" tabindex="-1">問いを読み込んでいます。</h1>');
  else if (loadState === 'unpublished') shell('<h1 class="us-page-title" tabindex="-1">公開準備中です。</h1><p class="us-intro">Omoi for Usは、ただいま公開に向けて準備しています。</p><div class="us-actions"><a class="us-secondary" href="../">シリーズ一覧へ</a></div>');
  else if (loadState === 'error') shell(`<h1 class="us-page-title" tabindex="-1">問いを読み込めませんでした。</h1><p class="us-error" role="alert">${escape(loadError)}</p><div class="us-actions">${primary('もう一度読み込む', 'retry')}</div>`);
  else if (!game) { if (showIntro) introduction(); else setup(); }
  else if (game.screen === 'results') results();
  else if (game.screen === 'score') scoreScreen();
  else questionScreen();
  if (moveFocus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const card = app.querySelector('#question-card');
    if (card && (game.screen !== 'score' || game.conditionOpen)) focusQuestionCard(card, game.conditionOpen);
    else app.querySelector('.question-card-face[aria-hidden="false"] .us-score-title, main > h1')?.focus({ preventScroll: true });
  }
}

function act(action) {
  const next = advanceGame(game, action, cards);
  if (next === game) return;
  game = next;
  notice = '';
  saveGame();
  render(true);
  if (action.type === 'PASS') announcement.textContent = '同じ主役で、新しい問いを引きました。';
}

app.addEventListener('input', event => {
  const input = event.target.closest('[data-name-index]');
  if (input && !game) names[Number(input.dataset.nameIndex)] = input.value;
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || (!app.contains(button) && !dialog.contains(button))) return;
  if (button.dataset.deck && !game) { audience = button.dataset.deck; setupError = ''; render(); app.querySelector(`[data-deck="${audience}"]`)?.focus({ preventScroll: true }); return; }
  if (button.dataset.rounds && !game) { rounds = Number(button.dataset.rounds); render(); app.querySelector(`[data-rounds="${rounds}"]`)?.focus({ preventScroll: true }); return; }
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
    case 'intro-next':
      if (!game) {
        showIntro = false;
        try { sessionStorage.setItem(INTRO_KEY, 'true'); } catch { /* The introduction still closes in memory. */ }
        render(true);
      }
      break;
    case 'show-intro':
      if (!game) { showIntro = true; render(true); }
      break;
    case 'add-player':
      if (!game && names.length < 6) { names.push(nextPlayerName(names)); render(); app.querySelector(`[data-name-index="${names.length - 1}"]`)?.focus(); }
      break;
    case 'remove-player':
      if (!game && names.length > 2) { names.splice(Number(button.dataset.index), 1); render(); app.querySelector('[data-action="add-player"]')?.focus(); }
      break;
    case 'start':
    case 'again':
      if (loadState !== 'ready' || (game && game.screen !== 'results')) break;
      try {
        game = createGame({ names, audience, rounds }, cards);
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
        rounds = [1, 3, 5].includes(game.initialRounds) ? game.initialRounds : DEFAULT_ROUNDS;
        const url = new URL(location.href); url.searchParams.set('deck', audience); history.replaceState(null, '', url);
        notice = ''; saveGame(); render(true);
      }
      break;
    case 'toggle-large-text':
      largeText = !largeText;
      try { sessionStorage.setItem('omoi-for-us:large-text', String(largeText)); } catch { /* The display still changes in memory. */ }
      render(); app.querySelector('[data-action="toggle-large-text"]')?.focus({ preventScroll: true });
      break;
    case 'toggle-all-correct':
      if (game?.screen === 'score') {
        const scroll = window.scrollY;
        game = advanceGame(game, { type: 'TOGGLE_ALL_CORRECT' }, cards);
        saveGame(); render(); app.querySelector('[data-action="toggle-all-correct"]')?.focus({ preventScroll: true });
        window.scrollTo({ top: scroll, behavior: 'instant' });
      }
      break;
    case 'reselect': act({ type: 'RESELECT' }); break;
    case 'reveal': act({ type: 'REVEAL' }); break;
    case 'toggle-condition': act({ type: 'TOGGLE_CONDITION' }); break;
    case 'advance': act({ type: 'ADVANCE' }); break;
    case 'continue': act({ type: 'CONTINUE' }); break;
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
