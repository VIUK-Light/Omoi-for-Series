# Grokへの依頼 — Omoi for Self-Care

次の仕様に沿って、Omoi for Series の新シリーズ「Omoi for Self-Care」の質問データを作成してください。Omoi for Series は既存の「Omoi」とは別のプロダクトです。既存OmoiのLevel定義、データ、実装を参照・流用しないでください。

## 対象と目的

- 自分ひとりで使い、自分の気持ちや考えを振り返る質問カードです。他者との会話を想定しないでください。
- 自分の感情、日常のストレス、価値観、生活、人間関係について、自分のペースで考えられる問いを作ってください。
- Liteでは、最近うれしかったこと、好きなこと、安心できる時間、小さな達成感、今の気持ちを扱います。
- Deepでは、本音、人間関係で感じる負担、過去の経験と現在の価値観、自己理解、大切なこと、今後の生活を扱います。
- 医療的な診断・治療・心理評価を目的にしません。診断名を推測したり、心理状態を採点したりする問いを作りません。
- 過去のつらい経験、トラウマ、虐待、自傷などを無理に思い出させたり、詳細な説明を求めたりしません。
- 回答の入力・記録・保存は必要ありません。答えない、飛ばす、途中でやめる選択を尊重します。

## 作成数と分類

- `intensity` は `lite` と `deep` の2種類です。会話スタイル（通常 / 深掘り）とは別の分類です。
- `level` は1〜4です。`intensity` と混同せず、各 `level` に両方の `intensity` の質問を作成してください。
- 各 `level` × `intensity` の組み合わせにつき8問、合計64問を作成してください。
- 各質問に、通常表示する短い質問文 `text` と、自分でさらに考えるための質問文 `followUp` を1つずつ作成してください。
- 一人称で自然に読み、自分自身に向けて考えられる表現にしてください。「相手に聞いてみましょう」「お互いに」など対話や他者の回答を前提にする文は避けてください。
- カテゴリ候補: `emotions`, `daily-life`, `stress`, `relationships`, `memories`, `values`, `self-understanding`, `future`。必要なら同じ形式の短い英小文字スラッグを追加してください。

## 文章品質

- 中学生にも理解できる自然で平易な日本語にしてください。
- 一つの質問文では一つのことだけを尋ねてください。
- 誘導、評価、説教、楽観の押しつけを避け、特定の経験があることを前提にしないでください。
- 質問文と深掘り質問はそれぞれ80文字以内を目安にしてください。
- 質問文・深掘り質問の重複や、言い換えただけの質問を避けてください。
- `sensitivity` は0〜3の整数（0=軽い、3=特に慎重な話題）です。
- `contentNotes` は必要な注意タグだけを配列に入れます。使えるタグは `stress`, `relationship`, `memory`, `values` です。

## 出力形式

説明文やMarkdownコードフェンスを付けず、次の形の有効なJSONオブジェクトだけを出力してください。下の値は形式例であり、質問文の内容を流用しないでください。

{
  "schemaVersion": 1,
  "series": "self-care",
  "publicationStatus": "unpublished",
  "questions": [
    {
      "id": "self-care-emotions-lite-l1-001",
      "series": "self-care",
      "category": "emotions",
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

全64問を `questions` 配列に入れてください。IDはシリーズ内で重複させず、`self-care-<category>-<intensity>-l<level>-<3桁連番>` の形式にしてください。`source.stage` と `reviewStatus` はすべて上記の値を使い、質問が人間の審査を通ったとは記録しないでください。

`source.generatedAt`には実際に生成した日付を`YYYY-MM-DD`形式で入れ、書式例のプレースホルダーを残さないでください。
