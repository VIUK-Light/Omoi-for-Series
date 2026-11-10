import { questionCardFrameMarkup } from '../shared/question-card.mjs';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function options(card, choosing) {
  return `<ol class="us-options" aria-label="3つの選択肢">${card.options.map(option => {
    const content = `<span class="us-choice-number">${option.id}</span><span class="us-option-text">${escape(option.text)}</span>`;
    return `<li>${choosing ? `<button class="us-option" data-choice="${option.id}" type="button">${content}</button>` : `<div class="us-option">${content}</div>`}</li>`;
  }).join('')}</ol>`;
}

function scoreFace(card, game, person) {
  const answer = card.options.find(option => option.id === game.answer);
  const scorers = game.players.filter(player => player.id !== person.id).map(player => {
    const selected = game.correctIds.includes(player.id);
    return `<button class="us-scorer" data-player-id="${player.id}" type="button" aria-pressed="${selected}"><span class="us-checkbox" aria-hidden="true">${selected ? check : ''}</span><span class="us-scorer-name">${escape(player.name)}</span>${selected ? '<span class="us-point" aria-hidden="true">+1</span>' : ''}</button>`;
  }).join('');
  const allCorrect = game.correctIds.length === game.players.length - 1;
  return `<h1 id="main-question" class="us-score-title" tabindex="-1">${escape(person.name)}の答え</h1>
    <div class="us-revealed"><span class="us-choice-number">${answer.id}</span><span class="us-option-text">${escape(answer.text)}</span></div>
    <p class="us-question-reference">問い：${escape(card.prompt)}</p><p class="us-reason">そう選んだ理由を話してみよう。</p>
    <section aria-labelledby="us-scorers-heading"><div class="us-scorers-heading"><h2 id="us-scorers-heading" class="us-score-label">当たった人を選ぶ</h2><button class="us-text-button us-all-correct" data-action="toggle-all-correct" aria-pressed="${allCorrect}" type="button">${allCorrect ? '全員を外す' : '全員的中'}</button></div><div class="us-scorers">${scorers}</div></section>`;
}

function conditionFace(card, game) {
  // The selected answer must not enter either face's markup until reveal.
  const answer = game.screen === 'score' ? card.options.find(option => option.id === game.answer) : null;
  return `<aside class="us-card-condition${game.conditionOpen ? ' us-condition' : ''}" aria-labelledby="follow-up-question"><h2 id="follow-up-question" class="follow-up-text us-condition-title" tabindex="-1">もしも、この条件なら？</h2><p class="us-condition-copy">${escape(card.condition)}</p></aside>
    <p class="us-question-reference">${escape(card.prompt)}</p>${answer ? `<div class="us-public-answer"><span class="us-answer-label">主役が選んだ答え</span><p><span class="us-choice-number">${answer.id}</span><span>${escape(answer.text)}</span></p></div>` : ''}
    ${options(card, false)}<p class="us-reason">ここからは自由に話すおまけ。追加の得点はありません。</p>`;
}

export function gameCardMarkup(card, game, person) {
  const score = game.screen === 'score';
  return `<div class="card-stage">${questionCardFrameMarkup({
    id: card.id, target: 'Us', className: 'us-question', revealed: game.conditionOpen,
    frontLabel: score ? '主役の答えと得点' : game.screen === 'choose' ? '主役だけが答えを選ぶ' : 'みんなで予想する',
    backLabel: 'おまけの会話',
    frontContent: score ? scoreFace(card, game, person) : `<h1 id="main-question" class="question-text" tabindex="-1">${escape(card.prompt)}</h1>${options(card, game.screen === 'choose')}`,
    backContent: conditionFace(card, game),
  })}</div>`;
}
