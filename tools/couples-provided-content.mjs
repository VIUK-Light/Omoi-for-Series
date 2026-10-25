import { createHash } from "node:crypto";
import { COUPLES_DEEP_SELECTION } from "./couples-deep-selection.mjs";

// The user's exact supplied text is the only exception to the edited-card
// length and audience-wording checks. Both content and provenance must match.
export function hasVerifiedProvidedCouplesText(question) {
  const entry = COUPLES_DEEP_SELECTION.added.find(item => item.reference.mode === "verbatim" && item.question.id === question.id);
  if (!entry || question.source !== "user-provided" || question.textFormat !== "verbatim-consultation" || typeof question.text !== "string") return false;
  const hash = createHash("sha256").update(question.text).digest("hex");
  return question.text === entry.question.text && hash === question.contentSha256 && hash === entry.reference.contentSha256;
}
