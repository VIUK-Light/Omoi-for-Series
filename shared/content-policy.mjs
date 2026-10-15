import { isDevelopmentHost } from "./question-engine.mjs";

// Generation provenance and human-review gates shared by browser and validators.
export function hasValidAiSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
  const models = { grok: 'Grok', codex: 'GPT-6' };
  if (!Object.hasOwn(models, source.kind) || source.model !== models[source.kind]) return false;
  if (source.stage !== 'ai-initial-draft' || !/^\d{4}-\d{2}-\d{2}$/.test(source.generatedAt || '')) return false;
  const date = new Date(`${source.generatedAt}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === source.generatedAt;
}

export function canShowReviewedContent(reviewStatus, { allowDrafts = false } = {}) {
  return reviewStatus === 'approved' || (allowDrafts && reviewStatus === 'pending');
}

export function mergeLegacyFollowUps(questions, data, series, { allowDrafts = false } = {}) {
  if (data?.schemaVersion !== 1 || data.series !== series || !hasValidAiSource(data.source)) {
    throw new Error(`${series}: 深掘り質問の形式または作成元が不正です。`);
  }
  if (!['pending', 'approved'].includes(data.reviewStatus) || !data.questions || typeof data.questions !== 'object' || Array.isArray(data.questions)) {
    throw new Error(`${series}: 深掘り質問のレビュー情報または質問一覧が不正です。`);
  }
  const ids = new Set(questions.map(question => question.id));
  for (const id of Object.keys(data.questions)) {
    if (!ids.has(id)) throw new Error(`${series}: 元の質問が存在しない深掘り質問です (${id})。`);
  }
  for (const question of questions) {
    const text = data.questions[question.id];
    if (typeof text !== 'string' || !text.trim() || text.length > 160) {
      throw new Error(`${series}: 深掘り質問が未設定または長すぎます (${question.id})。`);
    }
  }
  if (!canShowReviewedContent(data.reviewStatus, { allowDrafts })) return questions;
  return questions.map(question => ({ ...question, followUp: data.questions[question.id].trim() }));
}

export function canPreviewDrafts(release, locationLike) {
  return release?.draftPreview === true && isDevelopmentHost(locationLike);
}
