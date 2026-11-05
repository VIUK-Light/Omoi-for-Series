import { readFileSync } from "node:fs";

export const COUPLES_DEEP_SELECTION = JSON.parse(readFileSync(
  new URL("./curation-couples-deep-selection.json", import.meta.url), "utf8",
));

export function selectCouplesDeepQuestions(cards) {
  const selection = COUPLES_DEEP_SELECTION;
  const deep = cards.filter(question => question.level >= 3);
  const byId = new Map(deep.map(question => [question.id, question]));
  const expectedIds = new Set([...selection.retainedIds, ...selection.excludedIds]);
  if (deep.length !== byId.size || byId.size !== expectedIds.size || deep.some(q => !expectedIds.has(q.id))) {
    throw new Error("Deepを12件に限定する前のデッキ構成が一致しません。");
  }
  const retained = selection.retainedIds.map(id => {
    const question = byId.get(id);
    if (!question) throw new Error(`残すDeep質問が見つかりません: ${id}`);
    return { ...question };
  });
  const added = selection.added.map(entry => ({ ...entry.question }));
  if (new Set([...retained, ...added].map(q => q.id)).size !== 12) throw new Error("Deepの12件に重複があります。");
  return [...cards.filter(question => question.level < 3), ...retained, ...added];
}
