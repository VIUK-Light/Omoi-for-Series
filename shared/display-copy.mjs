import { QuestionDataError } from "./content-policy.mjs";

export const MOBILE_COPY_QUERY = "(max-width: 640px)";
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function assertDisplayCopy(data, series, sourceQuestions) {
  if (!isObject(data) || data.schemaVersion !== 1 || data.series !== series || !isObject(data.questions)) {
    throw new QuestionDataError(`${series}: 表示文の形式が不正です。`);
  }
  const ids = new Set(sourceQuestions.map(({ id }) => id));
  for (const [id, entry] of Object.entries(data.questions)) {
    if (!ids.has(id)) throw new QuestionDataError(`${series}: 元の質問が存在しない表示文です (${id})。`);
    if (!isObject(entry) || !/^[a-f0-9]{64}$/.test(entry.sourceSha256 || "") ||
        Object.keys(entry).some((key) => !["sourceSha256", "text", "followUp"].includes(key)) ||
        (!Object.hasOwn(entry, "text") && !Object.hasOwn(entry, "followUp"))) {
      throw new QuestionDataError(`${series}: 表示文の項目・原文の照合情報が不正です (${id})。`);
    }
    for (const field of ["text", "followUp"]) {
      if (!Object.hasOwn(entry, field)) continue;
      const variants = entry[field];
      if (!isObject(variants) || Object.keys(variants).length !== 2 ||
          ["mobile", "desktop"].some((key) => typeof variants[key] !== "string" || !variants[key].trim() ||
            variants[key].includes("\r") || /<\/?[a-z][^>]*>/iu.test(variants[key]))) {
        throw new QuestionDataError(`${series}: PC・スマホ用の表示文が不正です (${id}/${field})。`);
      }
      if (variants.mobile.replaceAll("\n", "") !== variants.desktop.replaceAll("\n", "")) {
        throw new QuestionDataError(`${series}: PC・スマホ用の語句が一致しません (${id}/${field})。`);
      }
    }
  }
  return data.questions;
}

// Call after the source publication/review gates. A display override cannot
// supply a follow-up that was removed by those gates.
export function displayTextForQuestion(question, field, entries, mobile) {
  if (!["text", "followUp"].includes(field)) throw new TypeError("Unknown question side");
  const original = question[field];
  if (typeof original !== "string" || !original.trim()) return null;
  return entries?.[question.id]?.[field]?.[mobile ? "mobile" : "desktop"] ?? original;
}
