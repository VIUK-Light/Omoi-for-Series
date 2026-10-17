# Omoi for Series

Omoi for Series は既存の「Omoi」とは別のプロダクトです。既存OmoiのLevel定義・実装・質問データを共有せず、このリポジトリ内で管理します。

## シリーズとURL

- `/couples/` — Omoi for Couples
- `/family/` — Omoi for Family
- `/friends/` — Omoi for Friends
- `/adults/` — Omoi for Adults（18歳以上向け）
- `/self-care/` — Omoi for Self-Care（ひとりで使う）
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

正本Loves701問を保護したまま、Couples向けの公開デッキは現在**232問**です。2026-10-16に222問へ整理した後、2026-10-17のユーザー指示でDeep向けの主質問・深掘り10組を追加しました。旧477問を全件確認し、一般倫理・SNS炎上・いじめ対応・単独の友情・一般の自己紹介など255問を削除、113問を恋人との具体的な関係を話せる質問へ改稿しました。2組は深掘りのみを改稿、107組は主質問・深掘りとも維持しています。出典は正本文面を維持したLoves由来95問と編集質問137問です。変更前後と理由は[`tools/curation-couples.json`](tools/curation-couples.json)に記録しています。

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

`--canonical`を指定すると、正本701問を抽出して確認し、公開用JSONは変更しません。通常の`--release`では、上記のキュレーション方針と追加質問を適用した232問を出力します。検証では正本のハッシュと701問の抽出内容を確認したうえで、公開デッキの順序・編集内容・件数・出典を照合します。公開デッキのLevel別件数は51・49・63・69です。

## 質問の選択

質問は選択中のシリーズとLite/Deepの全プールから1問ずつランダムに選びます。質問数に上限はなく、使用履歴はページ内のメモリにのみ保持します。同じプールでは未使用IDを優先し、プールを周回するときは直前の質問を可能なら避けます。ページ再読み込みやLite/Deepの変更で履歴をリセットします。「次へ」でカードを進め、「今日はここまで」でいつでも終了できます。

画面全体にUD書体のBIZ UDPゴシックを使います。Google Fontsから400・700を`display=swap`で読み込み、読み込み前や取得できない環境ではOSのゴシック体で表示します。見出し・質問本文は太字のゴシック体、背景は白です。

会話スタイルは深掘りを初期選択にしています。通常スタイルでは質問の表面を表示します。深掘りスタイルでは「次へ」でカードが裏返り、追加質問を表示します。裏面でもう一度「次へ」を押すと次のカードへ進みます。カードは63:88の縦横比を保ち、最大幅304pxで表示します。反転中の連打を防ぎ、動きを減らす設定ではアニメーションを省きます。新シリーズは各質問の`followUp`を使い、既存3シリーズは`shared/followups/<series>.json`のID対応から個別の追加質問を読み込みます。深掘りは主質問IDに対応し、主質問を削除・改稿する際は対応も更新します。

## AdultsとSelf-Careのデータ

2026-10-15のユーザー許可により、CodexでAdultsとSelf-Careを各64組（メイン＋固有の深掘り）作成しました。Lite / Deep × Level 1〜4の8区分に各8組です。作成元は`codex` / `GPT-6`で、Grok生成とは記録しません。既存3シリーズにもCouples232・Family166・Friends150の計548文の個別深掘りを追加しています。作成元はAI初期案として識別可能なまま保持しています。AdultsとSelf-Careは2026-10-16のユーザーの明示的な公開指示により承認済みです。既存3シリーズの深掘りは`pending`です。今後Grokに依頼するためのプロンプトは[`prompts/grok-adults-questions.md`](prompts/grok-adults-questions.md)と[`prompts/grok-self-care-questions.md`](prompts/grok-self-care-questions.md)にあります。出力先のJSON枠は`shared/questions/adults.json`と`shared/questions/self-care.json`です。現在はAdults94組・Self-Care64組を公開しています。

### AI出力のJSON形式（Grok / Codex）

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

既存コマンド名はGrok用との互換性を保っていますが、Codexの正しい出典メタデータにも対応します。取り込みは空の対象に限定し、既存データを上書きしません。

```sh
node tools/validate-grok-questions.mjs --series adults --input /path/to/grok-adults.json
node tools/validate-grok-questions.mjs --series adults --input /path/to/grok-adults.json --import
node tools/validate-grok-questions.mjs --series self-care --input /path/to/grok-self-care.json --import
node tools/validate-grok-questions.mjs --series adults --release-ready
```

検証はJSONスキーマ、質問ID、必須項目、Lite/Deep・Level、重複・類似表現、圧力や露骨な性的表現を検査します。`--import`は対象JSONが空の未公開状態の場合だけ動き、すべての質問を`pending`のまま保ちます。公開準備確認は、全質問のレビュー承認と全Lite/Deep・Level組み合わせに最低3問があることを要求します。

AI初期案を検証しただけでは公開されません。公開にはレビュー状態を`approved`にし、データと[`shared/series-manifest.json`](shared/series-manifest.json)の公開状態を明示的に変更する必要があります。現在のAdultsとSelf-Careは、2026-10-16のユーザーによる公開指示を`releaseApproval`に記録して公開しました。外部の専門審査を受けたという記録ではありません。Grok/Codexの初期案を自動承認する処理はありません。生成・取り込み・検証・レビューの各段階を分けて管理します。

`draftPreview: true`のシリーズはlocalhost / 127.0.0.1でのみレビュー前の実際のカードを試せます。画面に生成元・レビュー前のラベルは表示せず、レビュー状態はデータ側で管理します。本番では未承認の追加質問を採用しません。新2シリーズは`published`で、レビュー前データのプレビューは無効です。空の質問は表示しません。

既存シリーズの深掘りは、内容を人が確認した後に`shared/followups/<series>.json`の`reviewStatus`を`approved`へ変更すると本番でも利用できます。新2シリーズは各質問の承認と、データ・マニフェスト両方の公開状態変更が必要です。

追加の検証: `node tools/verify-followups.mjs` / `node --test tools/*.test.mjs`。AI生成元は`grok` / `Grok`または`codex` / `GPT-6`の正しい組み合わせを検証します。提供データは取り込み時の原文ハッシュと元の申告情報を別に保持します。AIによる内容チェックと人のレビュー承認は別に管理します。

## Family / Friendsの既存データ

Familyは166問（19組改稿・147組維持）、Friendsは150問（旧177問から27問削除・残る150組を改稿）の編集質問を収録しています。各シリーズの相手との関係に沿う内容へ整理し、変更前後と理由を`tools/curation-family.json`と`tools/curation-friends.json`に記録しています。回答者の同居、家事・介護・子育て、特定のアプリや交友経験を前提にする設問、重複や強い自己犠牲を促す設問を整理しました。Level別の件数は[`tools/verify-series-datasets.mjs`](tools/verify-series-datasets.mjs)で確認できます。

## 公開・品質管理

公開用の3シリーズデータの件数や出典は`tools/verify-series-datasets.mjs`で確認します。新シリーズのデータ形式と公開ゲートは`tools/validate-grok-questions.mjs`で検証します。`--release-ready`が成功しても質問内容の安全審査は人が行い、公開状態の変更は別途行います。

GitHub Pagesでビルド工程なしに配信する静的サイトです。ブランチへの変更は、GitHub Pagesの公開元ブランチを確認し、意図しない公開を避けてください。


## 提供されたAdultsデータの取り込み（2026-10-16）

ユーザーの許可により、提供された追加30組を本文・深掘り文を変更せず取り込みました。Adultsは既存64組と合わせて94組です。AIが新規作成した64組と、提供された30組を区別します。提供分の`source.kind`は`user-provided`、`stage`は`provided-draft`とし、原文にあった作成元表記は`source.original`に申告値として保持します。実際の生成モデルを確認したとは扱いません。本文・深掘り文のSHA-256を記録し、検証時に一致を確認します。

`node tools/import-provided-adults.mjs --input imports/adults-pending.json --date 2026-10-16`で再実行できます。同一ID・同一本文は再追加せず、内容が異なるID衝突では中止します。公開状態とレビュー状態を自動承認へ変更しません。

提供された成人向け原文は構造と完全性を検証して取り込み、AIが新規生成する質問の表現検査とは区別します。成人向け提供データに内容確認の警告が出ても、生成済み・審査済みと偽る処理は行いません。

## シリーズへの適合性確認（2026-10-16）

5シリーズの質問・深掘りを確認し、Couplesは恋人同士、Familyは家族、Friendsは一緒に使う友人同士に内容を限定しました。関係の不安・嫉妬・境界線・衝突などの話題は、具体的で中立的な問いとして残します。Adultsの既存AI案4組も親密な関係の問いへ改稿し、Self-Care64組は一人で振り返る内容として維持しました。提供されたAdults30組は原文・出典・ハッシュを維持しています。この内容確認とは別に、2026-10-16のユーザー指示に基づくAdultsとSelf-Careの公開承認を記録しています。

`tools/series-contracts.mjs`で現在の件数を固定し、`tools/series-fit-rules.mjs`と`tools/series-fit.test.mjs`で一般倫理・炎上事例・削除済みIDの再混入を検出します。自動判定は補助であり、文意の確認を代替しません。Couplesの再生成にも同じ除外・改稿方針を適用します。

## CouplesのDeep質問追加（2026-10-17）

ユーザーの依頼により、別れを考えた経験、相手の気になるところ、我慢、寂しさ、気持ちの変化、将来への迷い、心に残る言動、自分らしさ、負担、関係を変える希望の10組を追加しました。追加データと深掘りは`tools/couples-deep-additions.mjs`で管理し、再生成にも適用します。元の222問は変更しません。Level 3に4組、Level 4に6組を追加し、Liteには出しません。深掘りの個別生成元はsidecarの`questionSources`に記録し、既存のレビュー状態を維持します。
