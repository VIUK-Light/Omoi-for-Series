import { questionCardMarkup, updateQuestionCardSide } from "/shared/question-card.mjs?v=card-reform-1";
import { displayTextForQuestion, MOBILE_COPY_QUERY } from "/shared/display-copy.mjs";
import { followUpForQuestion } from "/shared/question-engine.mjs";

const select = document.querySelector("#review-case");
const slot = document.querySelector("#review-card-slot");
const flip = document.querySelector("#review-flip");
const viewport = window.matchMedia(MOBILE_COPY_QUERY);
let cases = [];
let index = 0;
let revealed = false;
let flipping = false;

function updateText() {
  const entry = cases[index];
  slot.querySelector("#main-question").textContent = displayTextForQuestion(entry.question, "text", entry.entries, viewport.matches);
  slot.querySelector("#follow-up-question").textContent = displayTextForQuestion(entry.question, "followUp", entry.entries, viewport.matches) ?? followUpForQuestion(entry.question, entry.series);
  document.querySelector("#review-layout").textContent = viewport.matches ? "スマホ用の改行" : "PC用の改行";
}

function render() {
  const entry = cases[index];
  document.body.dataset.audience = entry.series;
  select.value = String(index);
  revealed = entry.side === "followUp";
  slot.innerHTML = questionCardMarkup({
    id: entry.id, target: entry.target,
    text: displayTextForQuestion(entry.question, "text", entry.entries, viewport.matches),
    followUp: displayTextForQuestion(entry.question, "followUp", entry.entries, viewport.matches) ?? followUpForQuestion(entry.question, entry.series),
    solo: entry.series === "self-care", contentNotes: entry.question.contentNotes || [], revealed,
  });
  flip.textContent = revealed ? "表を見る" : "裏を見る";
  document.querySelector("#review-position").textContent = `${index + 1} / ${cases.length} · ${entry.target} · ${entry.side === "text" ? "主質問" : "深掘り"}`;
  document.querySelector("#review-source-text").textContent = entry.question[entry.side];
  document.querySelector("#review-source-id").textContent = entry.id;
  document.querySelector("#review-previous").disabled = index === 0;
  document.querySelector("#review-next").disabled = index === cases.length - 1;
  updateText();
}

select.addEventListener("change", () => { if (!flipping) { index = Number(select.value); render(); } });
document.querySelector("#review-previous").addEventListener("click", () => { if (!flipping && index > 0) { index--; render(); } });
document.querySelector("#review-next").addEventListener("click", () => { if (!flipping && index < cases.length - 1) { index++; render(); } });
flip.addEventListener("click", () => {
  if (flipping) return;
  revealed = !revealed;
  const card = slot.querySelector(".question-card");
  const inner = card.querySelector(".question-card-inner");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer;
  const complete = () => {
    clearTimeout(timer); inner.removeEventListener("transitionend", done);
    flipping = false; flip.disabled = false; select.disabled = false;
    card.querySelector(revealed ? ".follow-up-text" : ".question-text").focus({ preventScroll: true });
  };
  const done = (event) => { if (event.target === inner && event.propertyName === "transform") complete(); };
  if (!reducedMotion) {
    flipping = true; flip.disabled = true; select.disabled = true;
    inner.addEventListener("transitionend", done); timer = setTimeout(complete, 800);
  }
  updateQuestionCardSide(card, revealed);
  flip.textContent = revealed ? "表を見る" : "裏を見る";
  if (reducedMotion) complete();
});
viewport.addEventListener("change", () => { if (cases.length) updateText(); });

try {
  const response = await fetch("/preview/data", { cache: "no-cache" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "確認用データを読み込めませんでした。");
  cases = data.cases;
  select.replaceChildren(...cases.map((entry, i) => {
    const option = document.createElement("option");
    option.value = String(i); option.textContent = `${i + 1}. ${entry.target} · ${entry.label}`; return option;
  }));
  select.disabled = false;
  document.querySelector("#review-content").hidden = false;
  document.querySelector("#review-original").hidden = false;
  render();
} catch (error) {
  console.error(error);
  const status = document.querySelector("#review-status");
  status.setAttribute("role", "alert"); status.textContent = error.message;
}
