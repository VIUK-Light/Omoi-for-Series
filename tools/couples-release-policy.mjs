// Couples公開データの選別方針。移行・検証スクリプトで同じルールを使う。
export const RELEASE_EXCLUDED_IDS = new Set([
  "love-1-3", "ethics-max-4-14", "ethics-max-4-15",
  "other-2-2", "predictions-2-1", "predictions-2-4", "predictions-2-5", "predictions-2-8", "predictions-4-7",
  "ethics-max-4-12", "ethics-max-4-13", "love-4-25", "daily-2-7",
  "date-2-4", "love-3-1", "love-3-10", "friendship-1-4", "friendship-3-4", "contact-distance-4-2",
  "predictions-3-8", "values-2-7", "future-values-3-4", "date-4-2", "future-values-2-3", "love-1-9",
  "date-3-1", "date-3-2", "friendship-3-2", "bullying-4-1", "bullying-4-2", "ethics-3-3", "ethics-3-5",
  "love-4-2", "love-4-3", "jealousy-1-5", "jealousy-3-1", "jealousy-3-2", "jealousy-3-6",
  "affection-2-4", "affection-2-5", "memories-2-1", "memories-2-4", "memories-4-5",
  "love-4-24", "love-4-6", "jealousy-1-2", "jealousy-1-4", "jealousy-4-5", "conflict-support-3-5",
]);

export const RELEASE_EXCLUDED_CATEGORIES = new Set([
  "schoolLife", "schoolSelf", "studyFuture", "schoolPredictions", "teacherReport", "elementaryPredictions",
]);

const fixedReplacements = new Map([
  ["love-1-3", {
    id: "editorial-couples-1-1",
    audience: "couples",
    level: 1,
    text: "好きな人には、言葉で気持ちを伝えたい？態度で伝われば十分？",
    category: "romance",
    source: "editorial",
  }],
  ["ethics-max-4-14", {
    id: "editorial-couples-4-2",
    audience: "couples",
    level: 4,
    text: "自分にしつこく関わってきたり、事実ではない噂を流したりする人がいる。\n相手にも事情があると分かっていても、自分が傷つけられていいわけではない。\nあなたなら、相手の背景を考えて我慢する？\nはっきりやめてと伝える？\n信頼できる人に相談する？",
    category: "ethicsMax",
    source: "editorial",
  }],
  ["ethics-max-4-15", {
    id: "editorial-couples-4-3",
    audience: "couples",
    level: 4,
    text: "仲のいい友達が、別の人を傷つけるような冗談や悪口を言っていた。\n注意すれば関係が悪くなるかもしれない。\n黙っていれば、傷ついている人を見捨てるかもしれない。\nあなたなら、まず何をする？",
    category: "ethicsMax",
    source: "editorial",
  }],
]);

const reviewRewrites = [
  ["date-3-1", "editorial-couples-review-001", "一緒に出かける途中で寄り道するなら、どこに行きたい？"],
  ["date-3-2", "editorial-couples-review-002", "デートの帰りに、二人でどんな時間を過ごしたい？"],
  ["friendship-3-2", "editorial-couples-review-003", "その場のノリについていけないと感じる時はある？"],
  ["bullying-4-1", "editorial-couples-review-004", "友達が誰かを傷つけていると気づいたら、どんな対応ができると思う？"],
  ["bullying-4-2", "editorial-couples-review-005", "本人の気持ちを尊重しながら安全を守るために、誰に相談できると思う？"],
  ["ethics-3-3", "editorial-couples-review-006", "周りが間違いを黙認している時、自分は声を上げられると思う？"],
  ["ethics-3-5", "editorial-couples-review-007", "親しい人が誰かを傷つけていたら、どう向き合う？"],
  ["love-4-2", "editorial-couples-review-008", "恋人が自分以外の友人と親しくしている時、どんな場合に気になる？"],
  ["love-4-3", "editorial-couples-review-009", "恋人が自分以外の人と二人で出かけることをどう感じる？"],
  ["jealousy-1-5", "editorial-couples-review-010", "恋人が自分以外の人と親しく話している時、どんな気持ちになる？"],
  ["jealousy-3-1", "editorial-couples-review-011", "友人との距離感について、恋人と話しておきたいことはある？"],
  ["jealousy-3-2", "editorial-couples-review-012", "恋人が友人と二人で出かけることをどう考える？"],
  ["jealousy-3-6", "editorial-couples-review-013", "恋人の交友関係について、二人で決めておきたいことはある？"],
  ["affection-2-4", "editorial-couples-review-014", "恋人に言われてうれしい言葉は？"],
  ["affection-2-5", "editorial-couples-review-015", "恋人として伝えたい、相手がうれしくなる言葉は？"],
  ["memories-2-1", "editorial-couples-review-016", "お互いを意識し始めたきっかけは何？"],
  ["memories-2-4", "editorial-couples-review-017", "付き合う前、相手が気づいていなさそうだったことは？"],
  ["memories-4-5", "editorial-couples-review-018", "付き合う前の自分に一言伝えるなら？"],
  ["love-4-24", "editorial-couples-review-019", "過去の恋愛について、どのくらい共有したい？"],
  ["love-4-6", "editorial-couples-review-020", "スマホや個人アカウントのプライバシーで、大切にしたいことは？"],
  ["jealousy-1-2", "editorial-couples-review-021", "恋人が嫉妬や不安を感じている時、どう伝えてもらえるとうれしい？"],
  ["jealousy-1-4", "editorial-couples-review-022", "気にかけてもらう時、どんな関わり方が心地よい？"],
  ["jealousy-4-5", "editorial-couples-review-023", "二人が安心できる距離感と、それぞれの自由をどう両立したい？"],
  ["conflict-support-3-5", "editorial-couples-review-024", "恋人に、言葉にしにくくても共有したいことはある？"],
  ["values-2-4", "editorial-couples-review-025", "メッセージの返信は早い方が安心する？"],
  ["love-1-10", "editorial-couples-review-026", "会えない日に、どんなメッセージをもらうとうれしい？"],
  ["love-2-4", "editorial-couples-review-027", "毎日メッセージしたい？それとも、できる時で十分？"],
  ["contact-distance-1-1", "editorial-couples-review-028", "電話とメッセージ、どちらで話すのが好き？"],
  ["contact-distance-1-5", "editorial-couples-review-029", "メッセージで話すなら、どんな話題がいい？"],
  ["predictions-3-6", "editorial-couples-review-030", "相手は、連絡にすぐ返事をするタイプだと思う？"],
  ["contact-distance-4-1", "editorial-couples-review-031", "連絡の頻度や方法に違いがある時、どうすり合わせたい？"],
];

export function curateCouplesQuestions(canonical) {
  const canonicalById = new Map(canonical.map((card) => [card.id, card]));
  const replacements = new Map(fixedReplacements);

  for (const [sourceId, replacementId, text] of reviewRewrites) {
    const original = canonicalById.get(sourceId);
    if (!original) throw new Error(`編集対象が正本ソースにありません: ${sourceId}`);
    replacements.set(sourceId, {
      ...original,
      id: replacementId,
      text,
      source: "editorial",
    });
  }

  for (const id of RELEASE_EXCLUDED_IDS) {
    if (!canonicalById.has(id)) throw new Error(`除外対象が正本ソースにありません: ${id}`);
  }
  for (const id of fixedReplacements.keys()) {
    if (!canonicalById.has(id)) throw new Error(`置換対象が正本ソースにありません: ${id}`);
  }

  return canonical.flatMap((card) => {
    const replacement = replacements.get(card.id);
    if (replacement) return [replacement];
    if (RELEASE_EXCLUDED_CATEGORIES.has(card.category) || RELEASE_EXCLUDED_IDS.has(card.id)) return [];
    return [card];
  });
}
