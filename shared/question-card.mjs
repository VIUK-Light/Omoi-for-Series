import { questionMarkup } from "./question-text.mjs?v=card-reform-1";

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

const isEpisode = (id, target) => target === "Couples" && id.startsWith("editorial-couples-episode-");
// These two authored character names stay intact even on narrow screens.
const episodeMarkup = text => questionMarkup(text).replace(/アキさん|ユウさん/gu, name => `<span class="episode-name">${name}</span>`);

function mainQuestionMarkup({ id, target, text, textFormat }) {
  if (textFormat === "verbatim-consultation") return `<span class="episode-scenario verbatim-consultation">${questionMarkup(text)}</span>`;
  // Episode authors put the question on the final line. Keep every character
  // while giving the narrated event and the question separate visual weight.
  const episode = isEpisode(id, target);
  const paragraphBreak = episode ? text.lastIndexOf("\n\n") : -1;
  const questionBreak = paragraphBreak >= 0 ? paragraphBreak : episode ? text.lastIndexOf("\n") : -1;
  const separator = paragraphBreak >= 0 ? "\n\n" : "\n";
  return questionBreak >= 0
    ? `<span class="episode-scenario">${episodeMarkup(text.slice(0, questionBreak))}</span>${separator}<span class="episode-prompt">${episodeMarkup(text.slice(questionBreak + separator.length))}</span>`
    : questionMarkup(text);
}

export function updateQuestionCardText(card, { id, target, text, followUp, followUpLabel, textFormat }) {
  card.querySelector("#main-question").innerHTML = mainQuestionMarkup({ id, target, text, textFormat });
  card.querySelector("#follow-up-question").innerHTML = isEpisode(id, target) ? episodeMarkup(followUp) : questionMarkup(followUp);
  if (followUpLabel) card.querySelector(".question-category").textContent = followUpLabel;
}

// Shared by the product and the localhost review screen.
export function questionCardMarkup({ id, target, text, followUp, followUpLabel, textFormat, solo = false, contentNotes = [], revealed = false }) {
  const brand = `<span class="brand-prefix">Omoi for</span> <span class="brand-target">${questionMarkup(target)}</span>`;
  const noteLabels = contentNotes.map((category) => categoryLabels[category] || category);
  const notes = noteLabels.length
    ? `<p class="content-notes">内容の話題: ${noteLabels.map(questionMarkup).join("・")}</p>` : "";
  return `<article id="question-card" data-question-id="${questionMarkup(id)}" class="question-card${revealed ? " is-revealed" : ""}" aria-labelledby="${revealed ? "follow-up-question" : "main-question"}">
    <div class="question-card-inner">
      <section class="question-card-face question-card-front" aria-label="メインの質問" aria-hidden="${revealed}" ${revealed ? "inert" : ""}>
        <p class="card-series-name">${brand}</p>
        <div class="card-copy"><div class="card-copy-content"><h1 id="main-question" class="question-text" tabindex="-1">${mainQuestionMarkup({ id, target, text, textFormat })}</h1>${notes}</div></div>
        <span class="card-rule" aria-hidden="true"></span>
      </section>
      <section class="question-card-face question-card-back" aria-label="深掘り質問" aria-hidden="${!revealed}" ${revealed ? "" : "inert"}>
        <p class="card-series-name">${brand}</p>
        <div class="card-copy"><div class="card-copy-content"><p id="follow-up-progress" class="question-category">${questionMarkup(followUpLabel || (solo ? "もう少し考えてみる" : "もう少し話してみる"))}</p><h2 id="follow-up-question" class="follow-up-text" aria-describedby="follow-up-progress" tabindex="-1">${isEpisode(id, target) ? episodeMarkup(followUp) : questionMarkup(followUp)}</h2>${notes}</div></div>
        <span class="card-rule" aria-hidden="true"></span>
      </section>
    </div>
  </article>`;
}

export function focusQuestionCard(card, showFollowUp = false) {
  const target = card?.querySelector(showFollowUp ? ".follow-up-text" : ".question-text");
  if (!target) return;
  target.focus({ preventScroll: true });
  const bounds = target.getBoundingClientRect();
  const tall = bounds.height > window.innerHeight - 32;
  if (bounds.top < 16 || (!tall && bounds.bottom > window.innerHeight - 16)) {
    target.scrollIntoView({ block: tall ? "start" : "center", behavior: "auto" });
  }
}

export function updateQuestionCardSide(card, showFollowUp) {
  const front = card.querySelector(".question-card-front");
  const back = card.querySelector(".question-card-back");
  front.setAttribute("aria-hidden", String(showFollowUp));
  back.setAttribute("aria-hidden", String(!showFollowUp));
  front.inert = showFollowUp;
  back.inert = !showFollowUp;
  card.setAttribute("aria-labelledby", showFollowUp ? "follow-up-question" : "main-question");
  card.classList.toggle("is-revealed", showFollowUp);
}
