import { createHash } from "node:crypto";
import { COUPLES_DEEP_SELECTION } from "./couples-deep-selection.mjs";
import { COUPLES_COMPRESSED_CURATION } from "./couples-compressed-episodes.mjs";

// The user's exact supplied text is the only exception to the edited-card
// length and audience-wording checks. Both content and provenance must match.
export function hasVerifiedProvidedCouplesText(question) {
  const entry = COUPLES_DEEP_SELECTION.added.find(item => item.reference.mode === "verbatim" && item.question.id === question.id);
  if (!entry || question.source !== "user-provided" || question.textFormat !== "verbatim-consultation" || typeof question.text !== "string") return false;
  const hash = createHash("sha256").update(question.text).digest("hex");
  return question.text === entry.question.text && hash === question.contentSha256 && hash === entry.reference.contentSha256;
}

// Only explicitly recorded consultation revisions may use longer, first-person
// copy. Other cards keep the ordinary length and audience-wording checks.
export function hasVerifiedCouplesConsultation(question) {
  if (hasVerifiedProvidedCouplesText(question)) return true;
  if (question?.textFormat !== "edited-consultation" || typeof question.text !== "string") return false;
  const expected = [
    ...COUPLES_COMPRESSED_CURATION.rewritten.map(entry => entry.after.question),
    ...COUPLES_DEEP_SELECTION.added.map(entry => entry.question),
  ].find(entry => entry.id === question.id && entry.textFormat === "edited-consultation");
  if (!expected) return false;
  return ["id", "audience", "level", "category", "source", "textFormat", "contentSha256"].every(field => question[field] === expected[field])
    && question.text === expected.text
    && createHash("sha256").update(question.text).digest("hex") === expected.contentSha256;
}
