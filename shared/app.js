import { questionCardMarkup, updateQuestionCardSide, updateQuestionCardText, focusQuestionCard } from "./question-card.mjs?v=couples-context-3";
import { assertDisplayCopy, displayTextForQuestion, MOBILE_COPY_QUERY } from "./display-copy.mjs";
import {
  chooseSessionQuestions,
  filterQuestions,
  discussionPromptsForQuestion,
  conversationStyleForSelection,
  isDevelopmentHost,
} from "./question-engine.mjs";
import { QuestionDataError, assertQuestionDataset, questionLoadErrorMessage, canShowReviewedContent, canPreviewDrafts, mergeLegacyFollowUps } from "./content-policy.mjs?v=adults-import-1";

// Omoi for Series専用の共通UI。既存「Omoi」のデータや質問定義は読み込みません。
const audience = document.body.dataset.audience;
const app = document.querySelector("#take-for-app");
if (!audience || !app) throw new Error("Omoi for Series のシリーズIDまたは画面要素がありません。");

const series = {
  couples: {
    target: "Couples",
    title: "Omoi for Couples",
    setupHeading: "ふたりを、もう少し知る",
    setupCopy: "",
    solo: false,
  },
  family: {
    target: "Family",
    title: "Omoi for Family",
    setupHeading: "家族のことを、少し知る",
    setupCopy: "",
    solo: false,
  },
  friends: {
    target: "Friends",
    title: "Omoi for Friends",
    setupHeading: "友だちのことを、少し知る",
    setupCopy: "",
    solo: false,
  },
  adults: {
    target: "Adults",
    title: "Omoi for Adults",
    setupHeading: "大人向けの話題",
    setupCopy: "18歳以上向け",
    solo: false,
    adultOnly: true,
  },
  "self-care": {
    target: "Self-Care",
    title: "Omoi for Self-Care",
    setupHeading: "自分の声に、耳を傾ける",
    setupCopy: "ひとりで考える質問カード。回答の入力は不要です。",
    solo: true,
  },
}[audience];
if (!series) throw new Error(`未対応のOmoi for Seriesです: ${audience}`);

const intensities = [
  { value: "lite", name: "Lite", description: audience === "couples" ? "二人のことを話す" : series.solo ? "日常を振り返る" : "日常の話題" },
  { value: "deep", name: "Deep", description: audience === "couples" ? "第三者の出来事を考える" : "気持ちや価値観" },
];
const conversationStyles = [
  { value: "normal", name: "通常", description: "追加の質問なし" },
  { value: "deep-dive", name: "深掘り", description: "追加の質問つき" },
];


const copyViewport = window.matchMedia(MOBILE_COPY_QUERY);
let displayCopies = {};
let questions = [];
let selectedIntensity = "lite";
let selectedStyle = "deep-dive";
let currentQuestion = null;
let questionsAsked = 0;
let sessionActive = false;
let sessionFinished = false;
let deepWarningVisible = false;
let revealed = false;
let discussionIndex = 0;
let cardNeedsEntrance = false;
let loadState = "loading";
let loadError = "";
let cardTransitionActive = false;
let finishCardFlip = null;
let usedByPool = new Map();

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
const brandMarkup = () => `<span class="brand-prefix">Omoi for</span> <span class="brand-target">${escapeHtml(series.target)}</span>`;
const selectedPool = () => filterQuestions(questions, { intensity: selectedIntensity });
const isEpisodeSession = () => audience === "couples" && selectedIntensity === "deep";
const activeConversationStyle = () => conversationStyleForSelection(audience, selectedIntensity, selectedStyle);

function resetSession(clearHistory = false) {
  deepWarningVisible = false;
  finishCardFlip?.(false);
  currentQuestion = null;
  questionsAsked = 0;
  sessionActive = false;
  sessionFinished = false;
  revealed = false;
  discussionIndex = 0;
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
  discussionIndex = 0;
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
  discussionIndex = 0;
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
    ? "審査済みの質問データがありません。"
    : "質問データの確認が終わるまで利用できません。";
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column unpublished-content"><h1 class="page-title">${title}</h1><p class="page-intro">${escapeHtml(description)}</p><a class="primary-button back-to-series" href="../">シリーズ一覧へ戻る</a></main>${footer()}</div>`;
}

function renderEmptyPreview() {
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column selection-content"><h1 class="page-title">${escapeHtml(series.setupHeading)}</h1>${series.setupCopy ? `<p class="page-intro">${escapeHtml(series.setupCopy)}</p>` : ""}${modeControls()}<p class="selection-note preview-note" role="status">開発プレビュー：質問データがありません。</p></main>${footer()}</div>`;
}

function modeControls() {
  const heading = audience === "couples" ? "質問の種類" : "質問の踏み込み度";
  const styles = isEpisodeSession() ? "" : `<section class="selection-section" aria-labelledby="style-heading"><h2 id="style-heading">会話のスタイル</h2><div class="choice-list choice-pair" role="group" aria-label="会話方式">${conversationStyles.map((mode) => choiceButton({ group: "style", value: mode.value, label: mode.name, description: mode.description, selected: selectedStyle === mode.value })).join("")}</div></section>`;
  return `<section class="selection-section" aria-labelledby="intensity-heading"><h2 id="intensity-heading">${heading}</h2><div class="choice-list choice-pair" role="group" aria-label="${heading}">${intensities.map((mode) => choiceButton({ group: "intensity", value: mode.value, label: mode.name, description: mode.description, selected: selectedIntensity === mode.value })).join("")}</div>${isEpisodeSession() ? '<p class="selection-note">相談を読んで、あなたの考えを話します。</p>' : ""}</section>${styles}`;
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
  app.innerHTML = `<div class="site-shell">${header()}<main class="content-column selection-content"><h1 class="page-title">${escapeHtml(series.setupHeading)}</h1>${series.setupCopy ? `<p class="page-intro">${escapeHtml(series.setupCopy)}</p>` : ""}${modeControls()}<div class="selection-actions"><button class="primary-button" data-action="start" type="button" ${canStart ? "" : "disabled"}>はじめる <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg></button></div>${loadingNotice}</main>${footer()}</div>`;
}

function renderDeepWarning() {
  app.innerHTML = `<div class="site-shell session-shell">${header()}
    <main class="deep-warning-content">
      <section class="deep-warning-card" aria-labelledby="deep-warning-title" aria-describedby="deep-warning-copy">
        <p class="card-series-name">${brandMarkup()}</p>
        <div class="deep-warning-copy">
          <h1 id="deep-warning-title" tabindex="-1">刺激的な<br>内容があります。</h1>
          <p id="deep-warning-copy">性や身体など、<br>踏み込んだ話題を含みます。</p>
          <p>お互いが話したい範囲で、<br>無理なく進めてください。</p>
        </div>
        <span class="card-rule" aria-hidden="true"></span>
      </section>
      <div class="deep-warning-actions">
        <button class="primary-button" data-action="confirm-deep" type="button">続ける <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg></button>
        <button class="text-button" data-action="cancel-deep" type="button">戻る</button>
      </div>
    </main>${footer()}</div>`;
}

function focusQuestion(showFollowUp = false) {
  focusQuestionCard(app.querySelector("#question-card"), showFollowUp);
}

function currentCardText() {
  const prompts = discussionPromptsForQuestion(currentQuestion, audience);
  return {
    text: displayTextForQuestion(currentQuestion, "text", displayCopies, copyViewport.matches),
    followUp: discussionIndex === 0
      ? displayTextForQuestion(currentQuestion, "followUp", displayCopies, copyViewport.matches) ?? prompts[0]
      : prompts[discussionIndex],
    followUpLabel: isEpisodeSession() ? `さらに話す ${discussionIndex + 1} / ${prompts.length}` : undefined,
    textFormat: currentQuestion.textFormat,
  };
}

function questionActionsMarkup() {
  const episode = isEpisodeSession() && activeConversationStyle() === "deep-dive";
  const more = episode && revealed && discussionIndex + 1 < discussionPromptsForQuestion(currentQuestion, audience).length;
  const action = activeConversationStyle() === "deep-dive" && !revealed ? "reveal" : more ? "advance-discussion" : "next";
  const label = isEpisodeSession() ? (action === "reveal" ? "さらに話す" : more ? "次の問いへ" : "次の出来事へ") : "次へ";
  return `<button class="primary-button" data-action="${action}" aria-controls="question-card" type="button"><span data-action-label>${label}</span> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></svg></button>
    ${episode ? `<div class="episode-links">
      ${revealed && discussionIndex > 0 ? '<button class="text-button" data-action="previous-discussion" aria-controls="question-card" type="button">前の問いへ</button>' : ""}
      ${revealed ? '<button class="text-button" data-action="revisit" aria-controls="question-card" type="button">出来事に戻る</button>' : ""}
      ${!revealed || more ? '<button class="text-button" data-action="next" aria-controls="question-card" type="button">次の出来事へ</button>' : ""}
    </div>` : ""}`;
}

function refreshQuestionActions() {
  app.querySelector(".question-actions").innerHTML = questionActionsMarkup();
}

function changeDiscussion(offset) {
  if (!isEpisodeSession() || !revealed || cardTransitionActive) return;
  const index = discussionIndex + offset;
  if (index < 0 || index >= discussionPromptsForQuestion(currentQuestion, audience).length) return;
  discussionIndex = index;
  updateQuestionCardText(app.querySelector("#question-card"), { id: currentQuestion.id, target: series.target, ...currentCardText() });
  refreshQuestionActions();
  focusQuestion(true);
}

function renderQuestion() {
  const question = currentQuestion;
  if (!question) {
    resetSession();
    renderSelection();
    return;
  }
  const { text, followUp, followUpLabel, textFormat } = currentCardText();
  const contentNotes = Array.isArray(question.contentNotes) ? question.contentNotes : [];
  const enterClass = cardNeedsEntrance ? " is-entering" : "";
  cardNeedsEntrance = false;
  app.innerHTML = `<div class="site-shell session-shell">
    ${header({ canFinish: true })}
    <main class="session-content">

      <p class="progress" aria-label="質問 ${questionsAsked}問目">質問 ${questionsAsked}</p>
      <div class="card-stage${enterClass}">
        ${questionCardMarkup({ id: question.id, target: series.target, text, followUp, followUpLabel, textFormat, solo: series.solo, contentNotes, revealed })}
      </div>
      <div class="question-actions">
        ${questionActionsMarkup()}
      </div>
    </main>
    ${footer()}
  </div>`;
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
  refreshQuestionActions();
  const actionButtons = [...app.querySelectorAll(".question-actions button")];

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timeout;
  const complete = (moveFocus = true) => {
    clearTimeout(timeout);
    inner.removeEventListener("transitionend", onTransitionEnd);
    cardTransitionActive = false;
    finishCardFlip = null;
    actionButtons.forEach(button => { button.disabled = false; });
    card.removeAttribute("aria-busy");
    if (moveFocus) focusQuestion(showFollowUp);
  };
  const onTransitionEnd = (event) => {
    if (event.target === inner && event.propertyName === "transform") complete();
  };
  finishCardFlip = complete;
  if (!reducedMotion) {
    cardTransitionActive = true;
    actionButtons.forEach(button => { button.disabled = true; });
    card.setAttribute("aria-busy", "true");
    inner.addEventListener("transitionend", onTransitionEnd);
    // transitionend may not fire if the browser suspends motion or the tab.
    timeout = setTimeout(complete, 800);
  }
  updateQuestionCardSide(card, showFollowUp);
  if (reducedMotion) complete();
}

function renderFinish() {
  const finishCopy = series.solo ? `${questionsAsked}問を振り返りました。` : `${questionsAsked}問、話しました。`;
  app.innerHTML = `<div class="site-shell"><div class="finish-screen">${header()}<main class="finish-content"><h1 class="page-title">おつかれさま</h1><p class="page-intro">${finishCopy}</p><div class="finish-actions"><button class="primary-button" data-action="again" type="button">もう一度</button><a class="secondary-button" href="../">シリーズ一覧へ</a></div></main></div>${footer()}</div>`;
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
  if (deepWarningVisible) {
    renderDeepWarning();
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
    const manifestResponse = await fetch("../shared/series-manifest.json", { cache: "no-cache" });
    if (!manifestResponse.ok) throw new Error(`manifest HTTP ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    const release = manifest?.series?.[audience];
    if (!release || !["published", "unpublished"].includes(release.status)) throw new QuestionDataError("シリーズ公開設定がありません。");

    const developmentPreview = release.status === "unpublished" && release.developmentPreview === true && isDevelopmentHost(window.location);
    const allowDrafts = canPreviewDrafts(release, window.location);
    if (release.status === "unpublished" && !developmentPreview) {
      loadState = "unpublished";
      render();
      return;
    }

    const response = await fetch(`../shared/questions/${encodeURIComponent(release.questionFile)}`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`questions HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      // 既存3シリーズの配列JSONをそのまま読める互換レイヤーです。
      questions = data.filter((question) => question && question.id && typeof question.text === "string" && Number.isInteger(question.level));
      if (release.followUpFile) {
        const followUpResponse = await fetch(`../shared/followups/${encodeURIComponent(release.followUpFile)}`, { cache: "no-cache" });
        if (!followUpResponse.ok) throw new Error(`follow-ups HTTP ${followUpResponse.status}`);
        const followUpData = await followUpResponse.json();
        questions = mergeLegacyFollowUps(questions, followUpData, audience, { allowDrafts });
      }

    } else {
      assertQuestionDataset(data, audience, { published: release.status === "published" });
      questions = data.questions.filter((question) => canShowReviewedContent(question.reviewStatus, { allowDrafts }));
    }
    const displayResponse = await fetch(`../shared/display-copy/${audience}.json`, { cache: "no-cache" });
    if (!displayResponse.ok) throw new Error(`display copy HTTP ${displayResponse.status}`);
    displayCopies = assertDisplayCopy(await displayResponse.json(), audience, Array.isArray(data) ? data : data.questions);
    app.setAttribute("data-question-count", String(questions.length));
    loadState = questions.length ? "ready" : developmentPreview ? "preview-empty" : "empty";
    render();
  } catch (error) {
    console.error(`質問データの読み込みに失敗しました: ${audience}`, error);
    loadState = "error";
    loadError = questionLoadErrorMessage(error);
    render();
  }
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (cardTransitionActive && ["reveal", "revisit", "advance-discussion", "previous-discussion", "next"].includes(button.dataset.action)) return;

  if (button.dataset.intensity) {
    selectedIntensity = button.dataset.intensity;
    resetSession(true);
    render();
    return;
  }
  if (button.dataset.style) {
    if (isEpisodeSession()) return;
    selectedStyle = button.dataset.style;
    revealed = false;
    render();
    return;
  }
  switch (button.dataset.action) {
    case "start":
    case "again":
      if (series.adultOnly && selectedIntensity === "deep") {
        deepWarningVisible = true;
        render();
        app.querySelector("#deep-warning-title")?.focus({ preventScroll: true });
        break;
      }
      if (startSession()) {
        render();
        focusQuestion();
      }
      break;
    case "cancel-deep":
      resetSession();
      render();
      app.querySelector('[data-action="start"]')?.focus();
      break;
    case "confirm-deep":
      if (!deepWarningVisible || !series.adultOnly || selectedIntensity !== "deep") break;
      deepWarningVisible = false;
      if (startSession()) {
        render();
        focusQuestion();
      }
      break;
    case "reveal":
      setQuestionSide(true);
      break;
    case "revisit":
      if (isEpisodeSession() && revealed) setQuestionSide(false);
      break;
    case "advance-discussion":
      changeDiscussion(1);
      break;
    case "previous-discussion":
      changeDiscussion(-1);
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

app.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && deepWarningVisible) {
    resetSession();
    render();
    app.querySelector('[data-action="start"]')?.focus();
  }
});

copyViewport.addEventListener("change", () => {
  if (!sessionActive || !currentQuestion) return;
  const card = app.querySelector("#question-card");
  if (card) updateQuestionCardText(card, { id: currentQuestion.id, target: series.target, ...currentCardText() });
});
render();
loadQuestions();
