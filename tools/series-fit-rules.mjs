// Audience fit checks complement the explicit, per-record editorial audit.
const unrelatedCategories = new Set(['ethics','ethicsMax','bullying','friendship','schoolLife','schoolSelf','studyFuture','schoolPredictions','teacherReport','elementaryPredictions']);
const genericDilemmas = /何もしない選択にも罪|イベント出店|不衛生そうな試食|店名も顔も全部広め|コメント欄[\s\S]{0,20}炎上/u;
const abstractMoralExam = /(?:正義|善悪|倫理観|正当化|罪はある|正しい嘘|悪は悪)/u;
export function seriesFitIssues(question, series) {
  const issues=[];
  if(!question || typeof question.text !== 'string') return ['質問文がありません'];
  if(['couples','family','friends'].includes(series) && genericDilemmas.test(question.text)) issues.push('シリーズ外の一般倫理・第三者の炎上事例');
  if(series==='couples') {
    if(unrelatedCategories.has(question.category)) issues.push(`カップル向けではないカテゴリ: ${question.category}`);
    if(abstractMoralExam.test(question.text)) issues.push('一般的な道徳の正誤を問う設問');
  }
  if(series==='family') {
    if(!/^family[A-Z]/.test(question.category)) issues.push('Familyの関係テーマではないカテゴリ');
    if(!/家族|家庭|親|きょうだい|兄弟|姉妹|うちの家/u.test(question.text)) issues.push('家族との関わりが質問文で示されていない');
    if(abstractMoralExam.test(question.text)) issues.push('一般的な倫理テスト');
  }
  if(series==='friends') {
    if(!/^friends[A-Z]/.test(question.category)) issues.push('Friendsの関係テーマではないカテゴリ');
    if(!/私たち|私[とのにがをか]|一緒|二人|ふたり|お互い|相手|友達/u.test(question.text)) issues.push('友達同士の関わりが質問文で示されていない');
    if(abstractMoralExam.test(question.text)) issues.push('一般的な倫理テスト');
  }
  return issues;
}
