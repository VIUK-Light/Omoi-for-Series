// Omoi for Series のカード選択ロジック。既存 Omoi とは独立しています。

export function intensityForQuestion(question) {
  if (question?.intensity === "lite" || question?.intensity === "deep") return question.intensity;
  // 旧3シリーズは質問データを書き換えず、既存Levelから表示用モードを導きます。
  return Number(question?.level) <= 2 ? "lite" : "deep";
}

export function filterQuestions(questions, { intensity, level } = {}) {
  return questions.filter((question) => {
    if (intensity && intensityForQuestion(question) !== intensity) return false;
    if (Number.isInteger(level) && question.level !== level) return false;
    return true;
  });
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/**
 * ひとつのセッション内で重複を避け、セッション間では未使用IDを優先します。
 * プールの残数が足りない場合は周回し、直前のカードを可能なら避けます。
 */
export function chooseSessionQuestions(pool, count, previouslyUsedIds = new Set(), random = Math.random) {
  if (!Array.isArray(pool) || !Number.isInteger(count) || count < 1) {
    return { questions: [], usedIds: new Set(previouslyUsedIds) };
  }

  const validPool = pool.filter((question) => question && typeof question.id === "string");
  if (!validPool.length) return { questions: [], usedIds: new Set() };

  const countToPick = Math.min(count, validPool.length);
  const seen = new Set(previouslyUsedIds);
  const unseen = validPool.filter((question) => !seen.has(question.id));
  let picked = shuffle(unseen, random).slice(0, countToPick);

  if (picked.length < countToPick) {
    const pickedIds = new Set(picked.map((question) => question.id));
    const lastUsedId = [...seen].at(-1);
    const rollover = validPool.filter((question) => !pickedIds.has(question.id) && question.id !== lastUsedId);
    picked = [...picked, ...shuffle(rollover, random).slice(0, countToPick - picked.length)];
  }

  if (picked.length < countToPick) {
    const pickedIds = new Set(picked.map((question) => question.id));
    const remainder = validPool.filter((question) => !pickedIds.has(question.id));
    picked = [...picked, ...shuffle(remainder, random).slice(0, countToPick - picked.length)];
  }

  const nextUsedIds = unseen.length >= countToPick ? seen : new Set();
  for (const question of picked) nextUsedIds.add(question.id);
  if (nextUsedIds.size >= validPool.length) {
    nextUsedIds.clear();
    for (const question of picked) nextUsedIds.add(question.id);
  }

  return { questions: picked, usedIds: nextUsedIds };
}

export function nextQuestionIndex(currentIndex, totalQuestions) {
  if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) return 0;
  return Math.min(Math.max(0, currentIndex) + 1, totalQuestions);
}

export function followUpForQuestion(question, series) {
  if (typeof question?.followUp === "string" && question.followUp.trim()) return question.followUp.trim();
  const defaults = {
    couples: "そう感じるようになったきっかけはありますか？",
    family: "そのことについて、もう少し話したいことはありますか？",
    friends: "そのとき、どんな気持ちでしたか？",
  };
  return defaults[series] || "そのことについて、もう少し考えてみたいことはありますか？";
}

export function isDevelopmentHost(locationLike) {
  return locationLike?.protocol === "file:" || ["localhost", "127.0.0.1", "::1"].includes(locationLike?.hostname);
}
