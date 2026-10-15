import {
  chooseSessionQuestions,
  filterQuestions,
  followUpForQuestion,
  isDevelopmentHost,
} from "./question-engine.mjs";

// Omoi for Series専用の共通UI。既存「Omoi」のデータや質問定義は読み込みません。
const audience = document.body.dataset.audience;
const app = document.querySelector("#take-for-app");
if (!audience || !app) throw new Error("Omoi for Series のシリーズIDまたは画面要素がありません。");

const series = {
  couples: {
    target: "Couples",
    title: "Omoi for Couples",
    setupHeading: "ふたりを、もう少し知る",
    setupCopy: "ふたりで、話したいテーマを選びます。",
    solo: false,
  },
  family: {
    target: "Family",
    title: "Omoi for Family",
    setupHeading: "家族のことを、少し知る",
    setupCopy: "家族で、話したいテーマを選びます。",
    solo: false,
  },
  friends: {
    target: "Friends",
    title: "Omoi for Friends",
    setupHeading: "友だちのことを、少し知る",
    setupCopy: "友だちと、話したいテーマを選びます。",
    solo: false,
  },
  adults: {
    target: "Adults",
    title: "Omoi for Adults",
    setupHeading: "親密さについて、話す",
    setupCopy: "18歳以上の方が、互いの同意を尊重して使うカードです。",
    solo: false,
    adultOnly: true,
  },
  "self-care": {
    target: "Self-Care",
    title: "Omoi for Self-Care",
    setupHeading: "自分の声に、耳を傾ける",
    setupCopy: "ひとりで使います。答えは書かずに、心の中で考えるだけで大丈夫です。",
    solo: true,
  },
}[audience];
if (!series) throw new Error(`未対応のOmoi for Seriesです: ${audience}`);

const intensities = [
  { value: "lite", name: "Lite", description: "気軽に話せる、やさしい問い" },
  { value: "deep", name: "Deep", description: "気持ちや価値観に触れる問い" },
];
const conversationStyles = [
  { value: "normal", name: "通常", description: "メインの問いを表示" },
  { value: "deep-dive", name: "深掘り", description: "カードをめくって、もう一つの問いへ" },
];
const categoryLabels = {
  values: "価値観", romance: "恋愛", spicy: "いろいろ", daily: "日常", date: "デート",
  schoolLife: "学校", schoolSelf: "自分", studyFuture: "努力・将来", friendship: "友達",
  teacherReport: "先生・相談", bullying: "学校生活の悩み", memories: "思い出", affection: "愛情",
  contactDistance: "距離感", jealousy: "不安", conflictSupport: "本音", futureValues: "将来",
  boundaries: "境界線", ethics: "倫理", ethicsMax: "倫理Max", predictions: "予想",
  schoolPredictions: "学校予想", elementaryPredictions: "小学校予想", beforeDating: "付き合う前",
  reassurance: "安心感", affectionStyle: "甘え方", misunderstandings: "すれ違い", specialness: "特別感",
  commitment: "本気度", familyDaily: "日常", familyMemories: "思い出", familyValues: "価値観",
  familyCare: "支え合い", familyFuture: "これから", familyCommunication: "会話", familyBoundaries: "距離感",
  friendsDaily: "日常", friendsMemories: "思い出", friendsValues: "価値観", friendsCare: "支え合い",
  friendsFuture: "これから", friendsCommunication: "会話", friendsBoundaries: "距離感",
  intimacy: "親密さ", "body-image": "身体への考え", communication: "コミュニケーション",
  consent: "同意", relationship: "関係", relationships: "関係", emotions: "気持ち", emotion: "気持ち", "daily-life": "日常",
  stress: "負担やストレス", memory: "思い出", memories: "思い出", "self-understanding": "自己理解", future: "これから",
};

let questions = [];
let selectedIntensity = "lite";
let selectedStyle = "normal";
let currentQuestion = null;
let questionsAsked = 0;
let sessionActive = false;
let sessionFinished = false;
let revealed = false;
let cardNeedsEntrance = false;
let loadState = "loading";
let loadError = "";
let developmentPreviewActive = false;
let adultConfirmedThisPage = false;
let adultGateChecks = { age: false, notice: false };
let usedByPool = new Map();

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
const brandMarkup = () => `<span class="brand-prefix">Omoi for</span> <span class="brand-target">${escapeHtml(series.target)}</span>`;
const selectedPool = () => filterQuestions(questions, { intensity: selectedIntensity });
const categoryLabel = (category) => categoryLabels[category] || category;

function adultConfirmed() {
  if (!series.adultOnly) return true;
  if (adultConfirmedThisPage) return true;
  try {
    adultConfirmedThisPage = sessionStorage.getItem("omoi-for-adults-confirmed") === "yes";
  } catch {
    adultConfirmedThisPage = false;
  }
  return adultConfirmedThisPage;
}

function resetSession(clearHistory = false) {
  currentQuestion = null;
  questionsAsked = 0;
  sessionActive = false;
  sessionFinished = false;
  revealed = false;
  cardNeedsEntrance = false;
  if (clearHistory) usedByPool.clear();
}

function startSession() {
  const pool = selectedPool();
  if (!pool.length) return false;
  const historyKey = selectedIntensity;
  const previousIds = usedByPool.get(historyKey) || new Set();
  const selection = chooseSessionQuestions(pool, 1, previousIds);
  if (!selection.questions.length) return false;
  currentQuestion = selection.questions[0];
  questionsAsked = 1;
  sessionActive = true;
  sessionFinished = false;
  usedByPool.set(historyKey, selection.usedIds);
  revealed = false;
  cardNeedsEntrance = true;
  return true;
}

function drawNextQuestion() {
  const pool = selectedPool();
  if (!pool.length) return false;
  const historyKey = selectedIntensity;
  const previousIds = usedByPool.get(historyKey) || new Set();
  const selection = chooseSessionQuestions(pool, 1, previousIds);
  if (!selection.questions.length) return false;
  currentQuestion = selection.questions[0];
  questionsAsked += 1;
  usedByPool.set(historyKey, selection.usedIds);
  revealed = false;
  cardNeedsEntrance = true;
  return true;
}

function header({ canFinish = false } = {}) {
  const finishButton = canFinish
    ? '<button class="text-button" data-action="finish" type="button">今日はここまで</button>'
    : "";
  return `<header class="site-header"><a class="wordmark" href="../">${brandMarkup()}</a><span class="header-actions"><a class="text-button text-link" href="howto.html">使い方</a>${finishButton}</span></header>`;
}

function footer() {
  return '<footer class="site-footer"><a class="footer-official" href="https://viuk-light.org/" target="_blank" rel="noopener noreferrer">VIUK-Light</a></footer>';
}

function choiceButton({ group, value, label, description, selected }) {
  const dataAttribute = group === "intensity" ? `data-intensity="${value}"` : `data-style="${value}"`;
  return `<button class="choice-card${selected ? " is-selected" : ""}" ${dataAttribute} type="button" aria-pressed="${selected}"><span class="choice-copy"><strong>${escapeHtml(label)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ""}</span><span class="choice-mark" aria-hidden="true"></span></button>`;
}

function renderAdultsGate() {
  const canContinue = adultGateChecks.age && adultGateChecks.notice;
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column age-gate"><p class="section-label">Omoi for Adults</p><h1 class="page-title">利用前にご確認ください</h1><p class="page-intro">このシリーズは18歳以上の方向けです。身体、性、親密さ、同意など、センシティブな話題を含むことがあります。</p><div class="age-notice"><p><strong>答えない、飛ばす、途中でやめる自由があります。</strong></p><p>相手の答えを急かしたり、希望しない回答を求めたりしないでください。同意や境界線を尊重し、お互いが安心できる範囲で利用してください。</p><p>年齢の確認だけで、すべての状況における安全性が保証されるわけではありません。不安を感じた場合は利用を中断してください。</p></div><label class="check-row"><input data-adult-check="age" type="checkbox" ${adultGateChecks.age ? "checked" : ""}><span>私は18歳以上です</span></label><label class="check-row"><input data-adult-check="notice" type="checkbox" ${adultGateChecks.notice ? "checked" : ""}><span>内容と、回答しない自由について確認しました</span></label><div class="selection-actions"><button class="primary-button" data-action="accept-adults" type="button" ${canContinue ? "" : "disabled"}>確認して進む</button></div><a class="exit-adults" href="../">利用せず戻る</a></main>${footer()}</div>`;
}

function renderUnpublished() {
  const devPreview = isDevelopmentHost(window.location) && loadState === "preview-empty";
  const title = devPreview ? "開発プレビュー" : "公開準備中です";
  const description = devPreview
    ? "画面は確認できますが、審査済みの質問データはまだありません。質問を表示することはありません。"
    : "このシリーズはまだ未公開です。質問データの検証と人によるレビューが完了するまで、カードは表示されません。";
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column unpublished-content"><p class="section-label">${escapeHtml(series.title)}</p><h1 class="page-title">${title}</h1><p class="page-intro">${escapeHtml(description)}</p><p class="unpublished-note">${escapeHtml(series.setupCopy)}</p><a class="primary-button back-to-series" href="../">シリーズ一覧へ戻る</a></main>${footer()}</div>`;
}

function renderEmptyPreview() {
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column selection-content"><h1 class="page-title">${escapeHtml(series.setupHeading)}</h1><p class="page-intro">${escapeHtml(series.setupCopy)}</p>${modeControls()}<p class="selection-note preview-note" role="status">開発プレビューです。質問データはまだありません。質問カードは表示しません。</p></main>${footer()}</div>`;
}

function modeControls() {
  return `<section class="selection-section" aria-labelledby="intensity-heading"><h2 id="intensity-heading"><span class="mode-index">01</span>質問の踏み込み度</h2><div class="choice-list choice-pair" role="group" aria-label="質問内容の踏み込み度">${intensities.map((mode) => choiceButton({ group: "intensity", value: mode.value, label: mode.name, description: mode.description, selected: selectedIntensity === mode.value })).join("")}</div></section><section class="selection-section" aria-labelledby="style-heading"><h2 id="style-heading"><span class="mode-index">02</span>会話のスタイル</h2><div class="choice-list choice-pair" role="group" aria-label="会話方式">${conversationStyles.map((mode) => choiceButton({ group: "style", value: mode.value, label: mode.name, description: mode.description, selected: selectedStyle === mode.value })).join("")}</div></section>`;
}

function renderSelection() {
  const pool = selectedPool();
  const canStart = loadState === "ready" && pool.length > 0;
  const loadingNotice = loadState === "loading"
    ? '<p class="selection-note" role="status">質問を読み込んでいます…</p>'
    : loadState === "error"
      ? `<div class="error-message" role="alert"><p>${escapeHtml(loadError)}</p><button class="text-button" data-action="retry" type="button">もう一度読み込む</button></div>`
      : loadState === "empty"
        ? '<p class="selection-note" role="status">このシリーズは質問データがないため、現在利用できません。</p>'
      : loadState === "ready" && pool.length === 0
        ? '<p class="selection-note" role="status">質問を準備しています。</p>'
          : "";
  const adultNote = series.adultOnly
    ? '<aside class="safety-note" role="note">18歳以上向けです。答えたくない質問は飛ばせます。お互いの同意と境界を尊重してください。</aside>'
    : "";
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column selection-content">${developmentPreviewActive ? '<p class="preview-banner">開発プレビュー · 未公開</p>' : ""}<h1 class="page-title">${escapeHtml(series.setupHeading)}</h1><p class="page-intro">${escapeHtml(series.setupCopy)}</p>${modeControls()}<div class="selection-actions"><button class="primary-button" data-action="start" type="button" ${canStart ? "" : "disabled"}>質問カードをはじめる <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg></button></div>${adultNote}${loadingNotice}</main>${footer()}</div>`;
}

function renderQuestion() {
  const question = currentQuestion;
  if (!question) {
    resetSession();
    renderSelection();
    return;
  }
  const followUp = followUpForQuestion(question, audience);
  const questionCategory = question.category
    ? `<p class="question-category">${escapeHtml(categoryLabel(question.category))}</p>`
    : "";
  const noteTags = Array.isArray(question.contentNotes) && question.contentNotes.length
    ? `<p class="content-notes">内容の話題: ${question.contentNotes.map(categoryLabel).map(escapeHtml).join("・")}</p>`
    : "";
  const cardLabel = `${question.text}${revealed ? `。深掘り質問: ${followUp}` : ""}`;
  const revealAction = selectedStyle === "deep-dive" && !revealed;
  const mainAction = revealAction ? "reveal" : "next";
  const enterClass = cardNeedsEntrance ? " is-entering" : "";
  cardNeedsEntrance = false;
  const skipLabel = series.solo ? "今回は飛ばす" : "今回は話さない";
  app.innerHTML = `<div class="site-shell"><div class="question-screen">${header({ canFinish: true })}${developmentPreviewActive ? '<p class="preview-banner">開発プレビュー · 未公開</p>' : ""}<div class="question-header"><p class="progress" aria-label="質問 ${questionsAsked}問目">質問 ${questionsAsked}</p></div><article class="question-card${enterClass}" aria-live="polite" aria-label="${escapeHtml(cardLabel)}"><div class="question-card-inner"><section class="question-card-face question-card-front" aria-label="メインの質問" aria-hidden="false"><div class="card-face-content"><p class="card-series-name">${brandMarkup()}</p>${questionCategory}<h1 class="question-text">${escapeHtml(question.text)}</h1>${noteTags}</div></section><section class="question-card-face question-card-back" aria-label="深掘り質問" aria-hidden="true"><div class="card-face-content"><p class="section-label">もう少し話してみる</p><h2 class="follow-up-text">${escapeHtml(followUp)}</h2>${noteTags}</div></section></div></article><div class="question-actions"><button class="secondary-button" data-action="skip" type="button">${skipLabel}</button><button class="primary-button" data-action="${mainAction}" type="button">次へ</button></div></div>${footer()}</div>`;
}

function setQuestionSide(showFollowUp) {
  const card = app.querySelector(".question-card");
  const front = app.querySelector(".question-card-front");
  const back = app.querySelector(".question-card-back");
  if (!card || !front || !back) return;
  card.classList.toggle("is-revealed", showFollowUp);
  front.setAttribute("aria-hidden", String(showFollowUp));
  back.setAttribute("aria-hidden", String(!showFollowUp));
  const nextButton = app.querySelector(".question-actions .primary-button");
  if (nextButton) nextButton.dataset.action = showFollowUp ? "next" : selectedStyle === "deep-dive" ? "reveal" : "next";
  const question = currentQuestion;
  const followUp = followUpForQuestion(question, audience);
  card.setAttribute("aria-label", `${question.text}${showFollowUp ? `。深掘り質問: ${followUp}` : ""}`);
}

function renderFinish() {
  const finishCopy = series.solo ? `${questionsAsked}問を振り返りました。` : `${questionsAsked}問、話しました。`;
  const supportingCopy = series.solo ? "自分のペースで、いつでもまた始められます。" : "お互いのペースを大切にしてください。";
  app.innerHTML = `<div class="site-shell"><div class="finish-screen">${header()}<main class="finish-content"><p class="section-label">${escapeHtml(series.title)}</p><h1 class="page-title">おつかれさま</h1><p class="page-intro">${finishCopy}</p><p class="supporting-copy">${supportingCopy}</p><div class="finish-actions"><button class="primary-button" data-action="again" type="button">もう一度</button><a class="secondary-button" href="../">シリーズ一覧へ</a></div></main></div>${footer()}</div>`;
}

function render() {
  if (series.adultOnly && !adultConfirmed()) {
    renderAdultsGate();
    return;
  }
  if (loadState === "unpublished") {
    renderUnpublished();
    return;
  }
  if (loadState === "preview-empty") {
    renderEmptyPreview();
    return;
  }
  if (sessionFinished) {
    renderFinish();
    return;
  }
  if (sessionActive) {
    renderQuestion();
    return;
  }
  renderSelection();
}

async function loadQuestions() {
  loadState = "loading";
  loadError = "";
  render();
  try {
    const manifestResponse = await fetch("../shared/series-manifest.json");
    if (!manifestResponse.ok) throw new Error(`manifest HTTP ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    const release = manifest?.series?.[audience];
    if (!release || !["published", "unpublished"].includes(release.status)) throw new Error("シリーズ公開設定がありません。");

    const developmentPreview = release.status === "unpublished" && release.developmentPreview === true && isDevelopmentHost(window.location);
    developmentPreviewActive = developmentPreview;
    if (release.status === "unpublished" && !developmentPreview) {
      loadState = "unpublished";
      render();
      return;
    }

    const response = await fetch(`../shared/questions/${encodeURIComponent(release.questionFile)}`);
    if (!response.ok) throw new Error(`questions HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      // 既存3シリーズの配列JSONをそのまま読める互換レイヤーです。
      questions = data.filter((question) => question && question.id && typeof question.text === "string" && Number.isInteger(question.level));
    } else {
      if (data?.series !== audience || !Array.isArray(data?.questions)) throw new Error("シリーズの質問JSON形式が不正です。");
      if (release.status === "published" && data.publicationStatus !== "published") throw new Error("質問データが公開状態ではありません。");
      questions = data.questions.filter((question) => question && question.series === audience && question.reviewStatus === "approved" && typeof question.text === "string" && question.text.trim() && typeof question.followUp === "string" && question.followUp.trim());
    }
    loadState = questions.length ? "ready" : developmentPreview ? "preview-empty" : "empty";
    render();
  } catch (error) {
    console.error(`質問データの読み込みに失敗しました: ${audience}`, error);
    loadState = "error";
    loadError = "質問データを読み込めませんでした。通信状態を確認してください。";
    render();
  }
}

app.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-adult-check]");
  if (!input) return;
  adultGateChecks[input.dataset.adultCheck] = input.checked;
  renderAdultsGate();
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.adultCheck) return;

  if (button.dataset.intensity) {
    selectedIntensity = button.dataset.intensity;
    resetSession(true);
    render();
    return;
  }
  if (button.dataset.style) {
    selectedStyle = button.dataset.style;
    revealed = false;
    render();
    return;
  }
  switch (button.dataset.action) {
    case "accept-adults": {
      if (!adultGateChecks.age || !adultGateChecks.notice) return;
      adultConfirmedThisPage = true;
      try {
        sessionStorage.setItem("omoi-for-adults-confirmed", "yes");
      } catch {
        // Age confirmation remains in this page's memory for browsers with blocked storage.
      }
      render();
      break;
    }
    case "start":
    case "again":
      if (startSession()) render();
      break;
    case "reveal":
      revealed = true;
      setQuestionSide(true);
      app.querySelector('[data-action="next"]')?.focus();
      break;
    case "next":
    case "skip":
      if (drawNextQuestion()) {
        render();
        app.querySelector('[data-action="skip"]')?.focus();
      }
      break;
    case "finish":
      sessionActive = false;
      sessionFinished = true;
      revealed = false;
      render();
      app.querySelector('[data-action="again"]')?.focus();
      break;
    case "retry":
      loadQuestions();
      break;
    default:
      break;
  }
});

render();
loadQuestions();
