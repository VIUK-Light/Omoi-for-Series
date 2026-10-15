# Grokへの依頼 — Omoi for Adults

次の仕様に沿って、Omoi for Series の新シリーズ「Omoi for Adults」の質問データを作成してください。Omoi for Series は既存の「Omoi」とは別のプロダクトです。既存OmoiのLevel定義、データ、実装を参照・流用しないでください。

## 対象と目的

- 18歳以上を対象とする質問カードです。
- 身体、性、親密さ、恋愛関係、コミュニケーション、境界線、性的同意を扱い、過激さではなく互いの考えや気持ちの理解を助けます。
- 質問は成人向けですが、露骨な性的描写や性的行為の手順を尋ねません。
- 相手への圧力、同意の軽視、強要を促す問いを作りません。
- 断る・答えない・途中でやめる自由を尊重します。相手の境界を尊重する言い回しにしてください。
- 医療的な診断や治療、トラウマの告白を求めません。

## 作成数と分類

- `intensity` は `lite` と `deep` の2種類です。会話スタイル（通常 / 深掘り）とは別の分類です。
- `level` は1〜4です。`intensity` と混同せず、各 `level` に両方の `intensity` の質問を作成してください。
- 各 `level` × `intensity` の組み合わせにつき8問、合計64問を作成してください。
- 各質問に、通常表示する短い質問文 `text` と、その質問をさらに話すための質問文 `followUp` を1つずつ作成してください。
- Liteでは、親密さの価値観、身体や関係についての考え、パートナーとの比較的答えやすい会話を扱います。
- Deepでは、性の価値観や本音、身体への不安、境界線、性的同意、相互理解、希望や不満を、非露骨かつ非強制的に扱います。
- カテゴリ候補: `intimacy`, `body-image`, `communication`, `boundaries`, `consent`, `values`, `relationships`。必要なら同じ形式の短い英小文字スラッグを追加してください。

## 文章品質

- 自然で平易な日本語にしてください。専門用語や曖昧な比喩を避けます。
- 一つの質問文では一つのことだけを尋ねてください。
- 誘導せず、特定の経験があることを前提にしないでください。
- 質問文と深掘り質問はそれぞれ80文字以内を目安にしてください。
- 質問文・深掘り質問の重複や、言い換えただけの質問を避けてください。
- `sensitivity` は0〜3の整数（0=軽い、3=特に慎重な話題）です。
- `contentNotes` は必要な注意タグだけを配列に入れます。使えるタグは `intimacy`, `body-image`, `consent`, `boundaries`, `relationship` です。

## 出力形式

説明文やMarkdownコードフェンスを付けず、次の形の有効なJSONオブジェクトだけを出力してください。下の値は形式例であり、質問文の内容を流用しないでください。

{
  "schemaVersion": 1,
  "series": "adults",
  "publicationStatus": "unpublished",
  "questions": [
    {
      "id": "adults-communication-lite-l1-001",
      "series": "adults",
      "category": "communication",
      "level": 1,
      "intensity": "lite",
      "text": "ここに質問文",
      "followUp": "ここに深掘り質問",
      "sensitivity": 0,
      "contentNotes": [],
      "source": {
        "kind": "grok",
        "model": "Grok",
        "stage": "ai-initial-draft",
        "generatedAt": "YYYY-MM-DD"
      },
      "reviewStatus": "pending"
    }
  ]
}

全64問を `questions` 配列に入れてください。IDはシリーズ内で重複させず、`adults-<category>-<intensity>-l<level>-<3桁連番>` の形式にしてください。`source.stage` と `reviewStatus` はすべて上記の値を使い、質問が人間の審査を通ったとは記録しないでください。

`source.generatedAt`には実際に生成した日付を`YYYY-MM-DD`形式で入れ、書式例のプレースホルダーを残さないでください。
