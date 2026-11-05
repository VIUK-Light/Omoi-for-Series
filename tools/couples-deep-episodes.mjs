import { readFileSync } from "node:fs";

// Keep the previous curation as history; apply the episode revision last so a
// canonical Loves migration cannot silently restore personal Deep questions.
export const COUPLES_EPISODE_CURATION = JSON.parse(readFileSync(
  new URL("./curation-couples-deep-episodes.json", import.meta.url), "utf8",
));

export function applyCouplesDeepEpisodes(cards) {
  const rewrites = new Map(COUPLES_EPISODE_CURATION.rewritten.map(entry => [entry.before.id, entry]));
  const used = new Set();
  const result = cards.map(card => {
    if (card.level < 3) return card;
    const entry = rewrites.get(card.id);
    if (!entry) throw new Error(`Deepのエピソード置換がありません: ${card.id}`);
    for (const field of ["id", "audience", "level", "category", "source", "text"]) {
      if (card[field] !== entry.before[field]) throw new Error(`Deepの置換前データが一致しません: ${card.id}/${field}`);
    }
    used.add(card.id);
    const { followUp, ...question } = entry.after;
    return question;
  });
  if (used.size !== rewrites.size) throw new Error("Deepのエピソード置換に未使用または重複したIDがあります。");
  return result;
}
