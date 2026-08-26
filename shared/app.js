(() => {
  // Omoi for Series — ForSeries Core
  //
  // 既存 Omoi の実装・Level 意味論とは独立しています。
  // ただし、白背景・余白・少ない操作というUIの良さは共有します。

  const audience = document.body.dataset.audience;
  const app = document.querySelector('#take-for-app');
  if (!audience || !app) return;

  const meta = {
    couples: { title: 'Omoi for Couples', target: 'Couples', subtitle: 'ふたりの距離を、少しずつ近づける' },
    family: { title: 'Omoi for Family', target: 'Family', subtitle: '家族のことを、あらためて知る' },
    friends: { title: 'Omoi for Friends', target: 'Friends', subtitle: '友だちと、まだ知らない話をする' }
  }[audience];
  if (!meta) return;

  const levels = [
    { value: 1, name: '軽い話', description: '気軽に答えられる日常の話題' },
    { value: 2, name: '本音', description: 'お互いの考えや気持ちを知る' },
    { value: 3, name: '少し深い話', description: '気持ちや関係、価値観の話' },
    { value: 4, name: 'デリケートな話', description: 'ふだんは言えない本音を伝える' }
  ];

  const questionCounts = [3, 5, 10, 15];

  const categoryLabels = {
    values: '価値観', romance: '恋愛', spicy: 'いろいろ', daily: '日常', date: 'デート',
    schoolLife: '学校', schoolSelf: '自分', studyFuture: '努力・将来', friendship: '友達',
    teacherReport: '先生・相談', bullying: '学校生活の悩み', memories: '思い出', affection: '愛情',
    contactDistance: '距離感', jealousy: '不安', conflictSupport: '本音', futureValues: '将来',
    boundaries: '境界線', ethics: '倫理', ethicsMax: '倫理Max', predictions: '予想',
    schoolPredictions: '学校予想', elementaryPredictions: '小学校予想', beforeDating: '付き合う前',
    reassurance: '安心感', affectionStyle: '甘え方', misunderstandings: 'すれ違い', specialness: '特別感',
    commitment: '本気度', familyDaily: '日常', familyMemories: '思い出', familyValues: '価値観',
    familyCare: '支え合い', familyFuture: 'これから', familyCommunication: '会話', familyBoundaries: '距離感',
    friendsDaily: '日常', friendsMemories: '思い出', friendsValues: '価値観', friendsCare: '支え合い',
    friendsFuture: 'これから', friendsCommunication: '会話', friendsBoundaries: '距離感'
  };

  let questions = [];
  let selectedLevel = null;
  let selectedCount = null;
  let sessionQuestions = [];
  let currentIndex = 0;
  let loadState = 'loading';
  let loadError = '';

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
  const levelQuestions = () => questions.filter((question) => question.level === selectedLevel);
  const selectedLevelMeta = () => levels.find((level) => level.value === selectedLevel);
  const categoryLabel = (category) => categoryLabels[category] || category;
  const brandMarkup = () => `<span class="brand-prefix">Omoi for</span> <span class="brand-target">${escapeHtml(meta.target)}</span>`;

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function resetSession() {
    sessionQuestions = [];
    currentIndex = 0;
  }

  function startSession() {
    const pool = levelQuestions();
    if (!pool.length || !selectedCount) return false;
    sessionQuestions = shuffle(pool).slice(0, Math.min(selectedCount, pool.length));
    currentIndex = 0;
    return sessionQuestions.length > 0;
  }

  function header() {
    const backButton = selectedLevel && sessionQuestions.length
      ? '<button class="text-button" data-action="levels" type="button">← Levelを変える</button>'
      : '';
    return `<header class="site-header"><a class="wordmark" href="../">${brandMarkup()}</a><span class="header-actions"><a class="text-button text-link" href="howto.html">使い方</a>${backButton}</span></header>`;
  }

  function footer() {
    return '<footer class="site-footer"><a class="footer-official" href="https://viuk-light.org/" target="_blank" rel="noopener noreferrer">VIUK-Light</a></footer>';
  }

  function renderChoiceButton({ type, value, label, description, selected }) {
    const dataAttribute = type === 'level' ? `data-level="${value}"` : `data-count="${value}"`;
    return `<button class="choice-card${selected ? ' is-selected' : ''}" ${dataAttribute} type="button" aria-pressed="${selected}"><span class="choice-copy"><strong>${escapeHtml(label)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ''}</span><span class="choice-mark" aria-hidden="true"></span></button>`;
  }

  function renderSelection() {
    const pool = selectedLevel ? levelQuestions() : [];
    const disabled = loadState !== 'ready' || !selectedLevel || !selectedCount || !pool.length;
    const levelWarning = selectedLevel === 4
      ? '<p class="level-warning" role="note">デリケートな話題を含みます。無理に答えず「今回は話さない」を使えます。</p>'
      : '';
    const loadingNotice = loadState === 'loading'
      ? '<p class="selection-note" role="status">質問を読み込んでいます…</p>'
      : loadState === 'error'
        ? `<div class="error-message" role="alert"><p>${escapeHtml(loadError)}</p><button class="text-button" data-action="retry" type="button">もう一度読み込む</button></div>`
        : selectedLevel && !pool.length
          ? `<p class="selection-note" role="status">このLevelの質問を準備中です。</p>`
          : '';

    app.innerHTML = `<div class="site-shell">${header()}<main class="content-column selection-content"><h1 class="page-title">どのくらい話す？</h1><p class="page-intro">${escapeHtml(meta.subtitle)}</p><section class="selection-section" aria-labelledby="level-heading"><h2 id="level-heading">話の深さ</h2><div class="choice-list" role="group" aria-label="話の深さを選択">${levels.map((level) => renderChoiceButton({ type: 'level', value: level.value, label: `Level ${level.value}　${level.name}`, description: level.description, selected: selectedLevel === level.value })).join('')}</div></section><section class="selection-section" aria-labelledby="count-heading"><h2 id="count-heading">今回は何問話す？</h2><div class="count-list" role="group" aria-label="質問数を選択">${questionCounts.map((count) => renderChoiceButton({ type: 'count', value: count, label: `${count}問`, selected: selectedCount === count })).join('')}</div></section><div class="selection-actions"><button class="primary-button" data-action="start" type="button" ${disabled ? 'disabled' : ''}>はじめる</button></div>${levelWarning}${loadingNotice}</main>${footer()}</div>`;
  }

  function renderQuestion() {
    const question = sessionQuestions[currentIndex];
    const levelMeta = selectedLevelMeta();
    const lastQuestion = currentIndex === sessionQuestions.length - 1;
    const questionBody = question
      ? `<p class="question-text">${escapeHtml(question.text)}</p>${question.category ? `<p class="question-category">${escapeHtml(categoryLabel(question.category))}</p>` : ''}`
      : '<p class="question-text">質問を準備中です。</p>';

    app.innerHTML = `<div class="site-shell"><div class="question-screen">${header()}<div class="question-header"><div><p class="section-label">Level ${selectedLevel}</p><p class="level-name">${escapeHtml(levelMeta?.name || '')}</p></div><p class="progress" aria-label="${currentIndex + 1}問目、全${sessionQuestions.length}問">${currentIndex + 1} / ${sessionQuestions.length}</p></div><div class="question-content" aria-live="polite">${questionBody}</div><div class="question-actions"><button class="secondary-button" data-action="skip" type="button">今回は話さない</button><button class="primary-button" data-action="next" type="button">${lastQuestion ? '終わる' : '次の質問'}</button></div></div>${footer()}</div>`;
  }

  function renderFinish() {
    const levelMeta = selectedLevelMeta();
    app.innerHTML = `<div class="site-shell"><div class="finish-screen">${header()}<div class="finish-content"><p class="section-label">${escapeHtml(meta.title)}</p><h1 class="page-title">おつかれさま</h1><p class="page-intro">${sessionQuestions.length}問、話しました。</p><p class="supporting-copy">${escapeHtml(levelMeta?.name || '')}の時間を、ありがとうございました。</p><div class="finish-actions"><button class="primary-button" data-action="again" type="button">もう一度</button><button class="secondary-button" data-action="levels" type="button">Levelを選び直す</button></div></div></div>${footer()}</div>`;
  }

  function render() {
    if (sessionQuestions.length && currentIndex < sessionQuestions.length) {
      renderQuestion();
      return;
    }
    if (sessionQuestions.length && currentIndex >= sessionQuestions.length) {
      renderFinish();
      return;
    }
    renderSelection();
  }

  function loadQuestions() {
    loadState = 'loading';
    loadError = '';
    render();
    fetch(`../shared/questions/${audience}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('質問データが配列ではありません');
        questions = data.filter((question) => question && question.id && typeof question.text === 'string' && Number.isInteger(question.level));
        loadState = 'ready';
        render();
      })
      .catch((error) => {
        console.error(`質問データの読み込みに失敗しました: ${audience}`, error);
        loadState = 'error';
        loadError = '質問データを読み込めませんでした。通信状態を確認してください。';
        render();
      });
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.level) {
      selectedLevel = Number(button.dataset.level);
      resetSession();
      render();
      return;
    }

    if (button.dataset.count) {
      selectedCount = Number(button.dataset.count);
      render();
      return;
    }

    if (button.dataset.action === 'start') {
      if (startSession()) render();
      return;
    }

    if (button.dataset.action === 'next' || button.dataset.action === 'skip') {
      currentIndex += 1;
      render();
      return;
    }

    if (button.dataset.action === 'again') {
      if (startSession()) render();
      return;
    }

    if (button.dataset.action === 'levels') {
      selectedLevel = null;
      selectedCount = null;
      resetSession();
      render();
      return;
    }

    if (button.dataset.action === 'retry') loadQuestions();
  });

  render();
  loadQuestions();
})();
