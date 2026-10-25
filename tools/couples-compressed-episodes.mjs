import { readFileSync } from "node:fs";

export const COUPLES_COMPRESSED_CURATION = JSON.parse(readFileSync(
  new URL("./curation-couples-compressed-episodes.json", import.meta.url), "utf8",
));

export function applyCompressedCouplesEpisodes(cards) {
  const revisions = new Map(COUPLES_COMPRESSED_CURATION.rewritten.map(entry => [entry.before.question.id, entry]));
  const used = new Set();
  const result = cards.map(question => {
    const entry = revisions.get(question.id);
    if (!entry) return question;
    for (const field of ["id", "audience", "level", "category", "source", "text"]) {
      if (question[field] !== entry.before.question[field]) throw new Error(`相談画像の圧縮前データが一致しません: ${question.id}/${field}`);
    }
    used.add(question.id);
    return { ...entry.after.question };
  });
  if (used.size !== revisions.size) throw new Error("相談画像の圧縮に未使用または重複した質問IDがあります。");
  return result;
}
