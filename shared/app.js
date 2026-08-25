(() => {
  const audience = document.body.dataset.audience;
  const app = document.querySelector('#take-for-app');
  if (!audience || !app) return;

  const meta = {
    couples: { title: 'Take for Couples', subtitle: 'ふたりの距離を、少しずつ近づける' },
    family: { title: 'Take for Family', subtitle: '家族のことを、あらためて知る' },
    friends: { title: 'Take for Friends', subtitle: '友だちと、まだ知らない話をする' }
  }[audience];
  const levels = [
    { value: 1, name: '身近な話', description: '気軽にはじめる' },
    { value: 2, name: '考える話', description: '相手の考えを知る' },
    { value: 3, name: '重い話', description: '大切なことに触れる' },
    { value: 4, name: '深い話', description: '本音で向き合う' }
  ];
  let questions = [];
  let selectedLevel = null;
  let questionIndex = 0;

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const levelQuestions = () => questions.filter((question) => question.level === selectedLevel);
  const header = () => `<header class="site-header"><a class="wordmark" href="../">Take for</a>${selectedLevel ? '<button class="text-button" data-action="levels" type="button">Level一覧へ</button>' : ''}</header>`;

  function render() {
    if (!selectedLevel) {
      app.innerHTML = `<div class="site-shell">${header()}<div class="content-column"><p class="section-label">${meta.title}</p><h1 class="page-title">どのくらい話す？</h1><p class="page-intro">${meta.subtitle}</p><p class="supporting-copy">今の気分に合う深さを選んでください。</p><nav class="level-list" aria-label="Levelを選択">${levels.map((level) => `<button class="level-row" data-level="${level.value}" type="button"><span class="level-index">Level ${level.value}</span><span class="level-detail"><strong>${level.name}</strong><small>${level.description}</small></span><span class="row-arrow" aria-hidden="true">→</span></button>`).join('')}</nav></div><footer class="site-footer"><span>${meta.title}</span><span>Take for</span></footer></div>`;
      return;
    }
    const currentLevels = levelQuestions();
    const levelMeta = levels.find((level) => level.value === selectedLevel);
    const current = currentLevels[questionIndex];
    const questionBody = current
      ? `<div class="question-content"><p class="question-text">${escapeHtml(current.text)}</p>${current.category ? `<p class="question-category">${escapeHtml(current.category)}</p>` : ''}${current.source === 'provisional' ? '<p class="migration-note">Lovesの質問データ移行前の仮データです。</p>' : ''}</div>`
      : '<div class="empty-question"><p class="question-text">このシリーズの質問を準備中です。</p><p class="question-category">Level ' + selectedLevel + '</p></div>';
    app.innerHTML = `<div class="site-shell"><div class="question-screen">${header()}<div class="question-header"><div><p class="section-label">Level ${selectedLevel}</p><p class="level-name">${levelMeta.name}</p></div>${currentLevels.length ? `<p class="progress">${questionIndex + 1} / ${currentLevels.length}</p>` : ''}</div>${questionBody}<button class="primary-button" data-action="next" type="button" ${currentLevels.length ? '' : 'disabled'}>${currentLevels.length && questionIndex === currentLevels.length - 1 ? '最初から' : '次の質問'}</button></div><footer class="site-footer"><span>${meta.title}</span><span>Take for</span></footer></div>`;
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.level) { selectedLevel = Number(button.dataset.level); questionIndex = 0; render(); }
    if (button.dataset.action === 'levels') { selectedLevel = null; questionIndex = 0; render(); }
    if (button.dataset.action === 'next' && levelQuestions().length) { questionIndex = (questionIndex + 1) % levelQuestions().length; render(); }
  });

  fetch(`../shared/questions/${audience}.json`)
    .then((response) => response.ok ? response.json() : [])
    .then((data) => { questions = Array.isArray(data) ? data : []; render(); })
    .catch(() => { questions = []; render(); });
  render();
})();
