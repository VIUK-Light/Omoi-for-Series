import {
  chooseSessionQuestions,
  filterQuestions,
  followUpForQuestion,
  isDevelopmentHost,
} from "./question-engine.mjs";
import { hasValidAiSource, canShowReviewedContent, canPreviewDrafts, mergeLegacyFollowUps } from "./content-policy.mjs";

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
  { value: "lite", name: "Lite", description: series.solo ? "気軽に振り返る、やさしい問い" : "気軽に話せる、やさしい問い" },
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
let selectedStyle = "deep-dive";
let currentQuestion = null;
let questionsAsked = 0;
let sessionActive = false;
let sessionFinished = false;
let revealed = false;
let cardNeedsEntrance = false;
let loadState = "loading";
let loadError = "";
let cardTransitionActive = false;
let finishCardFlip = null;
let usedByPool = new Map();

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
// Keep Japanese words together while allowing natural breaks between them.
const japaneseWords = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("ja", { granularity: "word" })
  : null;
function questionMarkup(text) {
  if (!japaneseWords) return escapeHtml(text);
  return Array.from(japaneseWords.segment(text), ({ segment, isWordLike }) => isWordLike && Array.from(segment).length <= 6
    ? `<span class="question-word">${escapeHtml(segment)}</span>`
    : escapeHtml(segment)).join("");
}
const brandMarkup = () => `<span class="brand-prefix">Omoi for</span> <span class="brand-target">${escapeHtml(series.target)}</span>`;
const selectedPool = () => filterQuestions(questions, { intensity: selectedIntensity });
const categoryLabel = (category) => categoryLabels[category] || category;

function resetSession(clearHistory = false) {
  finishCardFlip?.(false);
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
  return `<section class="selection-section" aria-labelledby="intensity-heading"><h2 id="intensity-heading">質問の踏み込み度</h2><div class="choice-list choice-pair" role="group" aria-label="質問内容の踏み込み度">${intensities.map((mode) => choiceButton({ group: "intensity", value: mode.value, label: mode.name, description: mode.description, selected: selectedIntensity === mode.value })).join("")}</div></section><section class="selection-section" aria-labelledby="style-heading"><h2 id="style-heading">会話のスタイル</h2><div class="choice-list choice-pair" role="group" aria-label="会話方式">${conversationStyles.map((mode) => choiceButton({ group: "style", value: mode.value, label: mode.name, description: mode.description, selected: selectedStyle === mode.value })).join("")}</div></section>`;
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
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column selection-content"><h1 class="page-title">${escapeHtml(series.setupHeading)}</h1><p class="page-intro">${escapeHtml(series.setupCopy)}</p>${modeControls()}<div class="selection-actions"><button class="primary-button" data-action="start" type="button" ${canStart ? "" : "disabled"}>質問カードをはじめる <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg></button></div>${loadingNotice}</main>${footer()}</div>`;
}

function questionLength(text) {
  const length = Array.from(text).length;
  return length > 75 ? "long" : length > 42 ? "medium" : "short";
}

function focusQuestion(showFollowUp = false) {
  app.querySelector(showFollowUp ? ".follow-up-text" : ".question-text")?.focus({ preventScroll: true });
}

function updateCardOverflow() {
  app.querySelectorAll(".card-copy").forEach((copy) => {
    if (copy.scrollHeight > copy.clientHeight + 1) copy.setAttribute("tabindex", "0");
    else copy.removeAttribute("tabindex");
  });
}

function renderQuestion() {
  const question = currentQuestion;
  if (!question) {
    resetSession();
    renderSelection();
    return;
  }
  const followUp = followUpForQuestion(question, audience);
  const noteTags = Array.isArray(question.contentNotes) && question.contentNotes.length
    ? `<p class="content-notes">内容の話題: ${question.contentNotes.map(categoryLabel).map(escapeHtml).join("・")}</p>`
    : "";
  const mainAction = selectedStyle === "deep-dive" && !revealed ? "reveal" : "next";
  const enterClass = cardNeedsEntrance ? " is-entering" : "";
  cardNeedsEntrance = false;
  const backLabel = series.solo ? "もう少し考えてみる" : "もう少し話してみる";
  app.innerHTML = `<div class="site-shell session-shell">
    ${header({ canFinish: true })}
    <main class="session-content">

      <p class="progress" aria-label="質問 ${questionsAsked}問目">質問 ${questionsAsked}</p>
      <div class="card-stage${enterClass}">
        <article id="question-card" class="question-card${revealed ? " is-revealed" : ""}" aria-labelledby="${revealed ? "follow-up-question" : "main-question"}">
          <div class="question-card-inner">
            <section class="question-card-face question-card-front" aria-label="メインの質問" aria-hidden="${revealed}" ${revealed ? "inert" : ""}>
              <p class="card-series-name">${brandMarkup()}</p>
              <div class="card-copy">
                <div class="card-copy-content">
                  <h1 id="main-question" class="question-text" data-length="${questionLength(question.text)}" tabindex="-1">${questionMarkup(question.text)}</h1>
                  ${noteTags}
                </div>
              </div>
              <span class="card-rule" aria-hidden="true"></span>
            </section>
            <section class="question-card-face question-card-back" aria-label="深掘り質問" aria-hidden="${!revealed}" ${revealed ? "" : "inert"}>
              <p class="card-series-name">${brandMarkup()}</p>
              <div class="card-copy">
                <div class="card-copy-content">
                  <p class="question-category">${backLabel}</p>
                  <h2 id="follow-up-question" class="follow-up-text" data-length="${questionLength(followUp)}" tabindex="-1">${questionMarkup(followUp)}</h2>
                  ${noteTags}
                </div>
              </div>
              <span class="card-rule" aria-hidden="true"></span>
            </section>
          </div>
        </article>
      </div>
      <div class="question-actions">
        <button class="primary-button" data-action="${mainAction}" aria-controls="question-card" type="button">次へ <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg></button>
      </div>
    </main>
    ${footer()}
  </div>`;
  requestAnimationFrame(updateCardOverflow);
}

function setQuestionSide(showFollowUp) {
  if (cardTransitionActive) return;
  const card = app.querySelector(".question-card");
  const inner = app.querySelector(".question-card-inner");
  const front = app.querySelector(".question-card-front");
  const back = app.querySelector(".question-card-back");
  const nextButton = app.querySelector(".question-actions .primary-button");
  if (!card || !inner || !front || !back || !nextButton) return;

  revealed = showFollowUp;
  front.setAttribute("aria-hidden", String(showFollowUp));
  back.setAttribute("aria-hidden", String(!showFollowUp));
  front.inert = showFollowUp;
  back.inert = !showFollowUp;
  card.setAttribute("aria-labelledby", showFollowUp ? "follow-up-question" : "main-question");
  nextButton.dataset.action = showFollowUp || selectedStyle === "normal" ? "next" : "reveal";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timeout;
  const complete = (moveFocus = true) => {
    clearTimeout(timeout);
    inner.removeEventListener("transitionend", onTransitionEnd);
    cardTransitionActive = false;
    finishCardFlip = null;
    nextButton.disabled = false;
    card.removeAttribute("aria-busy");
    if (moveFocus) focusQuestion(showFollowUp);
  };
  const onTransitionEnd = (event) => {
    if (event.target === inner && event.propertyName === "transform") complete();
  };
  finishCardFlip = complete;
  if (!reducedMotion) {
    cardTransitionActive = true;
    nextButton.disabled = true;
    card.setAttribute("aria-busy", "true");
    inner.addEventListener("transitionend", onTransitionEnd);
    // transitionend may not fire if the browser suspends motion or the tab.
    timeout = setTimeout(complete, 800);
  }
  card.classList.toggle("is-revealed", showFollowUp);
  if (reducedMotion) complete();
}

function renderFinish() {
  const finishCopy = series.solo ? `${questionsAsked}問を振り返りました。` : `${questionsAsked}問、話しました。`;
  const supportingCopy = series.solo ? "自分のペースで、いつでもまた始められます。" : "お互いのペースを大切にしてください。";
  app.innerHTML = `<div class="site-shell"><div class="finish-screen">${header()}<main class="finish-content"><p class="section-label">${escapeHtml(series.title)}</p><h1 class="page-title">おつかれさま</h1><p class="page-intro">${finishCopy}</p><p class="supporting-copy">${supportingCopy}</p><div class="finish-actions"><button class="primary-button" data-action="again" type="button">もう一度</button><a class="secondary-button" href="../">シリーズ一覧へ</a></div></main></div>${footer()}</div>`;
}

function render() {
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
    const allowDrafts = canPreviewDrafts(release, window.location);
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
      if (release.followUpFile) {
        const followUpResponse = await fetch(`../shared/followups/${encodeURIComponent(release.followUpFile)}`);
        if (!followUpResponse.ok) throw new Error(`follow-ups HTTP ${followUpResponse.status}`);
        const followUpData = await followUpResponse.json();
        questions = mergeLegacyFollowUps(questions, followUpData, audience, { allowDrafts });
      }

    } else {
      if (data?.series !== audience || !Array.isArray(data?.questions)) throw new Error("シリーズの質問JSON形式が不正です。");
      if (release.status === "published" && data.publicationStatus !== "published") throw new Error("質問データが公開状態ではありません。");
      if (data.questions.some((question) => !question || question.series !== audience || !hasValidAiSource(question.source) || !["approved", "pending"].includes(question.reviewStatus) || typeof question.text !== "string" || !question.text.trim() || typeof question.followUp !== "string" || !question.followUp.trim())) {
        throw new Error("質問データの作成元・レビュー情報または質問文が不正です。");
      }
      questions = data.questions.filter((question) => canShowReviewedContent(question.reviewStatus, { allowDrafts }));
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

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (cardTransitionActive && ["reveal", "next"].includes(button.dataset.action)) return;

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
    case "start":
    case "again":
      if (startSession()) {
        render();
        focusQuestion();
      }
      break;
    case "reveal":
      setQuestionSide(true);
      break;
    case "next":
      if (drawNextQuestion()) {
        render();
        focusQuestion();
      }
      break;
    case "finish":
      finishCardFlip?.(false);
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

window.addEventListener("resize", updateCardOverflow);
document.fonts?.addEventListener("loadingdone", updateCardOverflow);
render();
loadQuestions();
