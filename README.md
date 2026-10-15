# Omoi for Series

Omoi for Series は既存の「Omoi」とは別のプロダクトです。既存OmoiのLevel定義・実装・質問データを共有せず、このリポジトリ内で管理します。

## シリーズとURL

- `/couples/` — Omoi for Couples
- `/family/` — Omoi for Family
- `/friends/` — Omoi for Friends
- `/adults/` — Omoi for Adults（18歳以上向け・質問未公開）
- `/self-care/` — Omoi for Self-Care（ひとりで使う・質問未公開）
- `/howto.html` — 全シリーズの使い方
- 各シリーズの `/howto.html` — シリーズ専用の使い方

5シリーズは`shared/app.js`の共通画面を使います。シリーズごとの紹介、色、注意事項、質問データはシリーズIDと公開マニフェストで切り替えます。シリーズを増やすときは個別画面を複製せず、シリーズ設定・ルート・質問JSON・マニフェストを追加します。

## 質問内容と会話方式

次の2つを別々に選びます。

- **Lite / Deep** — 質問内容の踏み込み度
- **通常 / 深掘り** — メイン質問だけを表示するか、カードをめくって追加質問も表示するか

質問データは`level`と`intensity`を別々に持ちます。新シリーズではLiteとDeepのそれぞれにLevel 1〜4の質問を用意します。Levelは内部のデータ分類で、画面には表示しません。公開中の3シリーズはLevel 1〜2をLite、Level 3〜4をDeepとして扱います。

このリポジトリ内の`level`は会話の深さを示す内部値です。既存OmoiのLevel定義とは別です。

1. 軽い話 — 気軽に答えられる日常の話題
2. 本音 — 考えや気持ちを知る
3. 少し深い話 — 気持ちや関係、価値観の話
4. デリケートな話 — ふだんは言いにくい本音

## Couplesの既存データ

正本Lovesには701問あり、そのうち**477問**をCouples向けに選別しています。学校生活を前提にする6カテゴリ202問と、対象が限られる設問や重複22問を除き、31問を年齢・性別・学校への在籍・特定アプリに左右されない文面へ編集しました。公開デッキは正本文面を維持したLoves由来443問と、既存置換3問を含む編集質問34問です。

Loves由来カードは`source: "loves"`、編集質問は`source: "editorial"`です。除外と編集のID単位の契約は[`tools/couples-release-policy.mjs`](tools/couples-release-policy.mjs)で管理します。テンプレートから生成されるsupplementalカードは正本701問に含めていません。

### 正本と再現性

正本ソース、コミットSHA、Git blob SHA、ファイルSHA-256は[`tools/PROVENANCE.md`](tools/PROVENANCE.md)に記録しています。現在の正本は次のコミット済みblobです。

- Commit: `d98a9c2346c66f9bbc90a7a1eff636f88795cc86`
- Path: `Loveds/web/src/data/cards.ts`
- Blob: `61d01bd7021f19f5bea6f950bd0a428d491e69a3`

移行と監査は恒久的に再実行できます。

```sh
node tools/migrate-loves-couples.mjs /path/to/Loveds_publish/Loveds/web/src/data/cards.ts --release
node tools/verify-couples-dataset.mjs /path/to/Loveds_publish/Loveds/web/src/data/cards.ts
node tools/verify-series-datasets.mjs
```

`--canonical`を指定すると、正本701問を抽出して確認し、公開用JSONは変更しません。通常の`--release`では、上記のキュレーション方針を適用した477問を出力します。検証では正本のハッシュと701問の抽出内容を確認したうえで、公開デッキの順序・編集内容・件数・出典を照合します。公開デッキのLevel別件数は115・109・111・142です。

## 質問の選択

質問は選択中のシリーズとLite/Deepの全プールから1問ずつランダムに選びます。質問数に上限はなく、使用履歴はページ内のメモリにのみ保持します。同じプールでは未使用IDを優先し、プールを周回するときは直前の質問を可能なら避けます。ページ再読み込みやLite/Deepの変更で履歴をリセットします。「次へ」でカードを進め、「今日はここまで」でいつでも終了できます。

通常スタイルでは質問の表面を表示します。深掘りスタイルでは「次へ」でカードが裏返り、追加質問を表示します。裏面でもう一度「次へ」を押すと次のカードへ進みます。カードは63:88の縦横比を保ち、最大幅304pxで表示します。反転中の連打を防ぎ、動きを減らす設定ではアニメーションを省きます。新シリーズは各質問の`followUp`を使い、既存3シリーズはシリーズ共通の短い追加質問を表示します。

## AdultsとSelf-Careのデータ

初期質問はGrokで作る想定ですが、この変更ではGrokに質問生成を依頼していません。利用者がGrokに依頼するためのプロンプトは[`prompts/grok-adults-questions.md`](prompts/grok-adults-questions.md)と[`prompts/grok-self-care-questions.md`](prompts/grok-self-care-questions.md)にあります。出力先のJSON枠は`shared/questions/adults.json`と`shared/questions/self-care.json`です。どちらも現在は空の未公開状態です。

### Grok出力のJSON形式

ファイルのルートはシリーズ情報と質問配列を持つオブジェクトです。`questions`の各要素には、質問の分類・通常質問・深掘り質問・センシティブ度・内容タグ・生成元・人のレビュー状態を入れます。

```json
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
      "text": "ここにGrokが作成する質問文",
      "followUp": "ここにGrokが作成する深掘り質問",
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
```

Self-Careの場合はルートと質問の`series`を`self-care`にし、IDを`self-care-<category>-<intensity>-l<level>-<3桁連番>`にします。Adultsは18歳以上向けであることをシリーズ説明に表示し、独立した年齢確認・同意画面は表示しません。同意や相手の境界への配慮は使い方ページで案内します。Self-Careはひとりで使う専用説明にし、回答の入力や保存を求めず、医療的な診断・治療・心理評価を行いません。

### 検証と取り込み

Grok出力のJSONファイルを検証し、問題がなければ未公開状態で対象シリーズへ取り込みます。

```sh
node tools/validate-grok-questions.mjs --series adults --input /path/to/grok-adults.json
node tools/validate-grok-questions.mjs --series adults --input /path/to/grok-adults.json --import
node tools/validate-grok-questions.mjs --series self-care --input /path/to/grok-self-care.json --import
node tools/validate-grok-questions.mjs --series adults --release-ready
```

検証はJSONスキーマ、質問ID、必須項目、Lite/Deep・Level、重複・類似表現、圧力や露骨な性的表現を検査します。`--import`は対象JSONが空の未公開状態の場合だけ動き、すべての質問を`pending`のまま保ちます。公開準備確認は、全質問のレビュー承認と全Lite/Deep・Level組み合わせに最低3問があることを要求します。

AI初期案を検証しただけでは公開されません。人が質問を審査し、レビュー状態を`approved`にし、データと[`shared/series-manifest.json`](shared/series-manifest.json)の公開状態を明示的に変更するまでAdultsとSelf-Careは本番で未公開です。Grokの初期案を自動承認する処理はありません。生成・取り込み・検証・レビューの各段階を分けて管理します。

ローカルホストでは開発プレビュー画面を確認できます。未承認または空の質問は表示せず、画面だけを確認できます。

## Family / Friendsの既存データ

Familyは166問、Friendsは177問の編集質問を収録しています。回答者の同居、家事・介護・子育て、特定のアプリや交友経験を前提にする設問、重複や強い自己犠牲を促す設問を整理しました。Level別の件数は[`tools/verify-series-datasets.mjs`](tools/verify-series-datasets.mjs)で確認できます。

## 公開・品質管理

公開用の3シリーズデータの件数や出典は`tools/verify-series-datasets.mjs`で確認します。新シリーズのデータ形式と公開ゲートは`tools/validate-grok-questions.mjs`で検証します。`--release-ready`が成功しても質問内容の安全審査は人が行い、公開状態の変更は別途行います。

GitHub Pagesでビルド工程なしに配信する静的サイトです。ブランチへの変更は、GitHub Pagesの公開元ブランチを確認し、意図しない公開を避けてください。
