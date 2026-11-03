import { readFileSync } from "node:fs";

export const COUPLES_LITE_RESTORATIONS = JSON.parse(readFileSync(
  new URL("./curation-couples-lite-restorations.json", import.meta.url), "utf8",
));

export function restoreCouplesLiteQuestions(cards) {
  const ids = new Set(cards.map(question => question.id));
  const restored = COUPLES_LITE_RESTORATIONS.restored.map(({ after }) => {
    if (ids.has(after.id)) throw new Error(`Liteへの移動でIDが重複しています: ${after.id}`);
    ids.add(after.id);
    const { followUp, ...question } = after;
    return question;
  });
  return [...cards, ...restored];
}
