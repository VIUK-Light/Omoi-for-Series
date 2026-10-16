import { isDevelopmentHost } from "./question-engine.mjs";

export class QuestionDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuestionDataError';
  }
}

export function questionLoadErrorMessage(error) {
  if (error instanceof QuestionDataError) return error.message;
  if (error instanceof SyntaxError) return '質問データのJSON形式に問題があります。データを確認してください。';
  return '質問データを読み込めませんでした。通信状態を確認してください。';
}

// Generation provenance and human-review gates shared by browser and validators.
export function hasValidAiSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
  const models = { grok: 'Grok', codex: 'GPT-6' };
  if (!Object.hasOwn(models, source.kind) || source.model !== models[source.kind]) return false;
  if (source.stage !== 'ai-initial-draft' || !/^\d{4}-\d{2}-\d{2}$/.test(source.generatedAt || '')) return false;
  const date = new Date(`${source.generatedAt}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === source.generatedAt;
}

export function hasValidQuestionSource(source, series) {
  if (hasValidAiSource(source)) return true;
  if (series !== 'adults' || source?.kind !== 'user-provided' || source.stage !== 'provided-draft') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.importedAt || '') || !/^[a-f0-9]{64}$/.test(source.contentSha256 || '')) return false;
  const date = new Date(`${source.importedAt}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === source.importedAt
    && !!source.original && typeof source.original === 'object' && !Array.isArray(source.original)
    && typeof source.original.kind === 'string' && typeof source.original.model === 'string';
}

export function canShowReviewedContent(reviewStatus, { allowDrafts = false } = {}) {
  return reviewStatus === 'approved' || (allowDrafts && reviewStatus === 'pending');
}

export function mergeLegacyFollowUps(questions, data, series, { allowDrafts = false } = {}) {
  if (data?.schemaVersion !== 1 || data.series !== series || !hasValidAiSource(data.source)) {
    throw new QuestionDataError(`${series}: 深掘り質問の形式または作成元が不正です。`);
  }
  if (!['pending', 'approved'].includes(data.reviewStatus) || !data.questions || typeof data.questions !== 'object' || Array.isArray(data.questions)) {
    throw new QuestionDataError(`${series}: 深掘り質問のレビュー情報または質問一覧が不正です。`);
  }
  const ids = new Set(questions.map(question => question.id));
  for (const id of Object.keys(data.questions)) {
    if (!ids.has(id)) throw new QuestionDataError(`${series}: 元の質問が存在しない深掘り質問です (${id})。`);
  }
  for (const question of questions) {
    const text = data.questions[question.id];
    if (typeof text !== 'string' || !text.trim() || text.length > 160) {
      throw new QuestionDataError(`${series}: 深掘り質問が未設定または長すぎます (${question.id})。`);
    }
  }
  if (!canShowReviewedContent(data.reviewStatus, { allowDrafts })) return questions;
  return questions.map(question => ({ ...question, followUp: data.questions[question.id].trim() }));
}

export function canPreviewDrafts(release, locationLike) {
  return release?.draftPreview === true && isDevelopmentHost(locationLike);
}

export function assertQuestionDataset(data, series, { published = false } = {}) {
  if (!data || Array.isArray(data) || data.series !== series || !Array.isArray(data.questions)) {
    throw new QuestionDataError('質問データの形式に問題があります。シリーズと質問一覧を確認してください。');
  }
  if (published && data.publicationStatus !== 'published') {
    throw new QuestionDataError('質問データの公開設定が一致しません。');
  }
  for (let index = 0; index < data.questions.length; index += 1) {
    const question = data.questions[index];
    if (Array.isArray(question)) {
      throw new QuestionDataError(`質問一覧の${index + 1}件目に配列が入っています。追加する質問を同じ階層に並べてください。`);
    }
    if (!question || typeof question !== 'object' || question.series !== series || !hasValidQuestionSource(question.source, series) || !['approved','pending'].includes(question.reviewStatus) || typeof question.text !== 'string' || !question.text.trim() || typeof question.followUp !== 'string' || !question.followUp.trim()) {
      throw new QuestionDataError(`質問データの${index + 1}件目に形式・作成元・レビュー情報の不備があります。`);
    }
  }
}
