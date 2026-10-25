import { readFileSync } from "node:fs";

export const COUPLES_RESEARCH_CURATION = JSON.parse(readFileSync(
  new URL("./curation-couples-researched-episodes.json", import.meta.url), "utf8",
));

// Apply this layer after the original episode revision so earlier audits remain
// reproducible and the researched wording survives canonical regeneration.
export function applyResearchedCouplesEpisodes(cards) {
  const revisions = new Map(COUPLES_RESEARCH_CURATION.rewritten.map(entry => [entry.before.question.id, entry]));
  const used = new Set();
  const result = cards.map(question => {
    const entry = revisions.get(question.id);
    if (!entry) return question;
    for (const field of ["id", "audience", "level", "category", "source", "text"]) {
      if (question[field] !== entry.before.question[field]) throw new Error(`実例参考改稿の元データが一致しません: ${question.id}/${field}`);
    }
    used.add(question.id);
    return { ...entry.after.question };
  });
  if (used.size !== revisions.size) throw new Error("実例参考改稿に未使用または重複した質問IDがあります。");
  return result;
}
