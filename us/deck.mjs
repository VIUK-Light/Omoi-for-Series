import { isDevelopmentHost } from '../shared/question-engine.mjs';

export function assertGameDataset(data) {
  if (data?.schemaVersion !== 1 || data.series !== 'us' || !['published', 'unpublished'].includes(data.publicationStatus)
      || !Array.isArray(data.questions) || !data.questions.length) throw new Error('Usの質問データの形式を確認してください。');
  const ids = new Set();
  for (const card of data.questions) {
    if (!card || typeof card.id !== 'string' || !card.id || ids.has(card.id) || !['family', 'friends'].includes(card.audience)
      || typeof card.prompt !== 'string' || !card.prompt.trim() || typeof card.condition !== 'string' || !card.condition.trim()
      || !Array.isArray(card.options) || card.options.length !== 3
      || card.options.some((option, index) => option?.id !== String(index + 1) || typeof option.text !== 'string' || !option.text.trim())
      || new Set(card.options.map(option => option.text.trim())).size !== 3
      || !['pending', 'approved'].includes(card.reviewStatus)) throw new Error('Usの問い・3つの選択肢・条件変更の対応を確認してください。');
    ids.add(card.id);
  }
  return data;
}

export function playableCards(data, release, locationLike) {
  assertGameDataset(data);
  if (!release || !['published', 'unpublished'].includes(release.status) || release.status !== data.publicationStatus) {
    throw new Error('Usの公開設定と質問データが一致していません。');
  }
  const preview = release.status === 'unpublished' && release.developmentPreview === true && isDevelopmentHost(locationLike);
  if (release.status === 'unpublished' && !preview) return { available: false, cards: [] };
  return { available: true, cards: data.questions.filter(card => card.reviewStatus === 'approved' || (preview && release.draftPreview === true)) };
}
