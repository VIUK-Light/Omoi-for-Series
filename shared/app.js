(() => {
  // Omoi for Series — ForSeries Core
  //
  // このコアは既存 Omoi の実装・Level 意味論とは独立しています。
  // 数値が同じでも、OmoiLevel と ForSeriesLevel は別の概念です。
  //
  // ForSeriesLevel は Loves の歴史的な意図を引き継ぎます。
  //   Lv1: 軽い / Lv2: 本音 / Lv3: 少し深い / Lv4: デリケート
  //
  // Couples のデータ出典と再生成手順:
  //   tools/PROVENANCE.md
  //   tools/migrate-loves-couples.mjs
  //   tools/verify-couples-dataset.mjs

  const audience = document.body.dataset.audience;
  const app = document.querySelector('#take-for-app');
  if (!audience || !app) return;

  const meta = {
    couples: { title: 'Omoi for Couples', subtitle: 'ふたりの距離を、少しずつ近づける' },
    family: { title: 'Omoi for Family', subtitle: '家族のことを、あらためて知る' },
    friends: { title: 'Omoi for Friends', subtitle: '友だちと、まだ知らない話をする' }
  }[audience];
  if (!meta) return;

  // ForSeriesLevel — 既存 Omoi の「身近な話〜深い話」とは別の深さ尺度。
  const levels = [
    { value: 1, name: '軽い話', description: '気軽に答えられる日常の話題' },
    { value: 2, name: '本音', description: 'お互いの考えや気持ちを知る' },
    { value: 3, name: '少し深い話', description: '気持ちや関係、価値観の話' },
    { value: 4, name: 'デリケートな話', description: 'ふだんは言えない本音を伝える' }
  ];

  // Loves の正本(cards.ts categoryLabels)から復元した表示ラベル。
  const categoryLabels = {
    values: '価値観',
    romance: '恋愛',
    spicy: 'いろいろ',
    daily: '日常',
    date: 'デート',
    schoolLife: '学校',
    schoolSelf: '自分',
    studyFuture: '努力・将来',
    friendship: '友達',
    teacherReport: '先生・相談',
    bullying: '学校生活の悩み',
    memories: '思い出',
    affection: '愛情',
    contactDistance: '距離感',
    jealousy: '不安',
    conflictSupport: '本音',
    futureValues: '将来',
    boundaries: '境界線',
    ethics: '倫理',
    ethicsMax: '倫理Max',
    predictions: '予想',
    schoolPredictions: '学校予想',
    elementaryPredictions: '小学校予想',
    beforeDating: '付き合う前',
    reassurance: '安心感',
    affectionStyle: '甘え方',
    misunderstandings: 'すれ違い',
    specialness: '特別感',
    commitment: '本気度'
  };

  // Loves の質問選択挙動を引き継ぐセッション内プール。
  //   - 範囲: 現在の audience × 選択中 Level
  //   - 保存: メモリのみ。再読込・Level変更でリセット
  //   - 枯渇: 全問使用後にリセットして再抽選
  //   - リセット直後: 直前の質問を可能な限り除外(プールが1問だけの場合を除く)
  let questions = [];
  let selectedLevel = null;
  let currentQuestion = null;
  let usedQuestionIds = new Set();
  let lastQuestionId = null;

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const levelQuestions = () => questions.filter((question) => question.level === selectedLevel);
  const categoryLabel = (category) => categoryLabels[category] || category;
  const header = () => `<header class="site-header"><a class="wordmark" href="../">Omoi for</a>${selectedLevel ? '<button class="text-button" data-action="levels" type="button">Level一覧へ</button>' : ''}</header>`;

  function resetQuestionPool() {
    usedQuestionIds = new Set();
    currentQuestion = null;
    lastQuestionId = null;
  }

  function pickNextQuestion() {
    const pool = levelQuestions();
    if (!pool.length) {
      currentQuestion = null;
      return null;
    }

    let candidates = pool.filter((question) => (
      !usedQuestionIds.has(question.id) && question.id !== lastQuestionId
    ));

    if (!candidates.length) {
      usedQuestionIds.clear();
      candidates = pool.filter((question) => question.id !== lastQuestionId);
      if (!candidates.length) candidates = pool;
    }

    const next = candidates[Math.floor(Math.random() * candidates.length)];
    usedQuestionIds.add(next.id);
    lastQuestionId = next.id;
    currentQuestion = next;
    return next;
  }

  function render() {
    if (!selectedLevel) {
      app.innerHTML = `<div class="site-shell">${header()}<div class="content-column"><p class="section-label">${meta.title}</p><h1 class="page-title">どのくらい話す？</h1><p class="page-intro">${meta.subtitle}</p><p class="supporting-copy">今の気分に合う深さを選んでください。</p><nav class="level-list" aria-label="Levelを選択">${levels.map((level) => `<button class="level-row" data-level="${level.value}" type="button"><span class="level-index">Level ${level.value}</span><span class="level-detail"><strong>${level.name}</strong><small>${level.description}</small></span><span class="row-arrow" aria-hidden="true">→</span></button>`).join('')}</nav></div><footer class="site-footer"><span>${meta.title}</span><span>Omoi for</span></footer></div>`;
      return;
    }

    const currentLevels = levelQuestions();
    const levelMeta = levels.find((level) => level.value === selectedLevel);
    const questionBody = currentQuestion
      ? `<div class="question-content"><p class="question-text">${escapeHtml(currentQuestion.text)}</p>${currentQuestion.category ? `<p class="question-category">${escapeHtml(categoryLabel(currentQuestion.category))}</p>` : ''}</div>`
      : '<div class="empty-question"><p class="question-text">このシリーズの質問を準備中です。</p><p class="question-category">Level ' + selectedLevel + '</p></div>';
    const progress = currentQuestion && currentLevels.length
      ? `<p class="progress">${usedQuestionIds.size} / ${currentLevels.length}</p>`
      : '';

    app.innerHTML = `<div class="site-shell"><div class="question-screen">${header()}<div class="question-header"><div><p class="section-label">Level ${selectedLevel}</p><p class="level-name">${levelMeta.name}</p></div>${progress}</div>${questionBody}<button class="primary-button" data-action="next" type="button" ${currentQuestion ? '' : 'disabled'}>次の質問</button></div><footer class="site-footer"><span>${meta.title}</span><span>Omoi for</span></footer></div>`;
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.level) {
      selectedLevel = Number(button.dataset.level);
      resetQuestionPool();
      pickNextQuestion();
      render();
      return;
    }

    if (button.dataset.action === 'levels') {
      selectedLevel = null;
      resetQuestionPool();
      render();
      return;
    }

    if (button.dataset.action === 'next' && levelQuestions().length) {
      pickNextQuestion();
      render();
    }
  });

  fetch(`../shared/questions/${audience}.json`)
    .then((response) => response.ok ? response.json() : [])
    .then((data) => {
      questions = Array.isArray(data) ? data : [];
      if (selectedLevel && !currentQuestion) pickNextQuestion();
      render();
    })
    .catch(() => {
      questions = [];
      render();
    });
  render();
})();
