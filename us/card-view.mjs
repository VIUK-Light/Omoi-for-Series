import { questionCardFrameMarkup } from '../shared/question-card.mjs';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function options(card, choosing) {
  return `<ol class="us-options" aria-label="3つの選択肢">${card.options.map(option => {
    const content = `<span class="us-choice-number">${option.id}</span><span class="us-option-text">${escape(option.text)}</span>`;
    return `<li>${choosing ? `<button class="us-option" data-choice="${option.id}" type="button">${content}</button>` : `<div class="us-option">${content}</div>`}</li>`;
  }).join('')}</ol>`;
}

function questionFace(card, changed, choosing, active) {
  if (!changed) return `<h1 id="main-question" class="question-text" tabindex="-1">${escape(card.prompt)}</h1>${options(card, choosing && active)}`;
  return `<aside class="us-card-condition${active ? ' us-condition' : ''}" aria-labelledby="follow-up-question"><h2 id="follow-up-question" class="follow-up-text us-condition-title" tabindex="-1">条件が変わったら？</h2><p class="us-condition-copy">${escape(card.condition)}</p></aside><p class="us-question-reference">${escape(card.prompt)}</p>${options(card, choosing && active)}`;
}

function scoreFace(card, game, person, changed) {
  const answer = card.options.find(option => option.id === game.answer);
  const tag = changed ? 'h2' : 'h1';
  const id = changed ? 'follow-up-question' : 'main-question';
  const scorers = game.players.filter(player => player.id !== person.id).map(player => {
    const selected = game.correctIds.includes(player.id);
    return `<button class="us-scorer" data-player-id="${player.id}" type="button" aria-pressed="${selected}"><span class="us-checkbox" aria-hidden="true">${selected ? check : ''}</span><span class="us-scorer-name">${escape(player.name)}</span>${selected ? '<span class="us-point" aria-hidden="true">+1</span>' : ''}</button>`;
  }).join('');
  return `<${tag} id="${id}" class="us-score-title" tabindex="-1">${escape(person.name)}の答え</${tag}>
    <button class="us-revealed" data-action="edit-answer" type="button" aria-label="答えを選び直す" aria-describedby="us-revealed-text"><span class="us-choice-number">${answer.id}</span><span id="us-revealed-text" class="us-option-text">${escape(answer.text)}</span><svg class="us-answer-edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
    <p class="us-question-reference">問い：${escape(card.prompt)}</p>${changed ? `<details class="us-condition-reference"><summary>追加された条件を見る</summary><p>${escape(card.condition)}</p></details>` : ''}
    <p class="us-reason">そう選んだ理由を話してみよう。</p><section aria-labelledby="us-scorers-heading"><h3 id="us-scorers-heading" class="us-score-label">当たった人を選ぶ</h3><div class="us-scorers">${scorers}</div></section>`;
}

export function gameCardMarkup(card, game, person) {
  const changed = game.stage === 'changed';
  const score = game.screen === 'score';
  const choosing = game.screen === 'answer';
  return `<div class="card-stage">${questionCardFrameMarkup({
    id: card.id, target: 'Us', className: 'us-question', revealed: changed,
    frontLabel: score && !changed ? '主役の答え' : '問いと3つの選択肢',
    backLabel: score && changed ? '条件変更後の主役の答え' : '条件変更と3つの選択肢',
    frontContent: score && !changed ? scoreFace(card, game, person, false) : questionFace(card, false, choosing, !changed),
    backContent: score && changed ? scoreFace(card, game, person, true) : questionFace(card, true, choosing, changed),
  })}</div>`;
}
