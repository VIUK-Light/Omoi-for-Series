# Omoi for Series

## カード表示のローカル確認

```sh
node tools/card-preview.mjs
```

`http://127.0.0.1:4176/preview/` で代表23表示を切り替えられます。最初の12枚は現在のCouples Deep全件です。実際のカードと同じ描画処理・CSSを使います。640px以下ではスマホ用、それより広い画面ではPC用の改行を表示します。確認サーバーは127.0.0.1だけで待ち受けます。

表示用の改稿と改行は `shared/display-copy/<series>.json` に記録します。未登録の質問は元の文章を使います。元データ・出典・承認状態は変更せず、承認済み、または既存設定でローカル確認が許可された内容にだけ表示文を適用します。PC・スマホの語句は改行を除いて一致させてください。

`node tools/verify-display-copy.mjs` で原文ペアのSHA-256、画面間の語句の一致、ID対応、変更した文章の重複を検証します。元の文章が変わった場合は表示文を再確認してから照合値を更新します。質問ごとの自動文字縮小や自動文節分割は使いません。

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

- **Lite / Deep** — Couplesでは二人自身のこと／第三者の出来事、それ以外では質問内容の踏み込み度
- **通常 / 深掘り** — メイン質問だけを表示するか、カードをめくって追加質問も表示するか。CouplesのDeepだけは深掘りに固定。

質問データは`level`と`intensity`を別々に持ちます。新シリーズではLiteとDeepのそれぞれにLevel 1〜4の質問を用意します。Levelは内部のデータ分類で、画面には表示しません。既存シリーズは原則Level 1〜2をLite、Level 3〜4をDeepとし、`intensity`を指定した質問はそちらを優先します。CouplesでLiteへ移した重い問いは元のLevelを維持して`intensity: "lite"`を付けています。

このリポジトリ内の`level`は会話の深さを示す内部値です。既存OmoiのLevel定義とは別です。

1. 軽い話 — 気軽に答えられる日常の話題
2. 本音 — 考えや気持ちを知る
3. 少し深い話 — 気持ちや関係、価値観の話
4. デリケートな話 — ふだんは言いにくい本音

## Couplesの既存データ

正本Loves701問を保護したまま、Couples向けのデッキは現在**128問**です。Lite116組は日常から寂しさ・将来の迷いまで二人自身のことを話す質問、Deep12組はユーザー提供の相談12件です。うち11件は経緯と迷いが伝わる要約、配信者の相談1件は明示指示により全文をそのまま収録しています。出典は正本文面を維持したLoves由来42問、編集質問85問、提供原文1問です。

2026-10-16の整理（477→222問）は[`tools/curation-couples.json`](tools/curation-couples.json)、2026-10-17のDeep10組追加は`tools/couples-deep-additions.mjs`に記録しています。その後、2026-10-25のユーザー指示でDeep全132組をエピソード形式へ置換しました。今回の変更前後・旧新ID・生成元は[`tools/curation-couples-deep-episodes.json`](tools/curation-couples-deep-episodes.json)に記録し、Lite100組の本文と深掘りの維持をハッシュで検証します。新しい個別深掘りは既存と同じ`pending`で、localhostで確認できます。

Loves由来カードは`source: "loves"`、編集質問は`source: "editorial"`です。除外と編集のID単位の契約は[`tools/couples-release-policy.mjs`](tools/couples-release-policy.mjs)で管理します。過去の編集を再現した後、`tools/couples-deep-selection.mjs`で提供された10件と追加2件だけをDeepに残し、最後に`tools/couples-lite-restorations.mjs`で旧Deepの直接質問16組をLiteへ移します。テンプレートから生成されるsupplementalカードは正本701問に含めていません。

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

`--canonical`を指定すると、正本701問を抽出して確認し、公開用JSONは変更しません。通常の`--release`では、上記のキュレーション方針と追加質問を適用した128問を出力します。検証では正本のハッシュと701問の抽出内容を確認したうえで、公開デッキの順序・編集内容・件数・出典・`intensity`を照合します。公開デッキのLevel別件数は51・49・13・15、モード別はLite116・Deep12です。

## 質問の選択

質問は選択中のシリーズとLite/Deepの全プールから1問ずつランダムに選びます。質問数に上限はなく、使用履歴はページ内のメモリにのみ保持します。同じプールでは未使用IDを優先し、プールを周回するときは直前の質問を可能なら避けます。ページ再読み込みやLite/Deepの変更で履歴をリセットします。「次へ」でカードを進め、「今日はここまで」でいつでも終了できます。

画面全体にUD書体のBIZ UDPゴシックを使います。Google Fontsから400・700を`display=swap`で読み込み、読み込み前や取得できない環境ではOSのゴシック体で表示します。見出し・質問本文は太字のゴシック体、背景は白です。

会話スタイルは深掘りを初期選択にしています。通常スタイルでは質問の表面を表示します。深掘りスタイルでは「次へ」でカードが裏返り、追加質問を表示します。裏面でもう一度「次へ」を押すと次のカードへ進みます。カードは最大幅340pxで、短文は63:88を目安に表示し、長い文章では表裏の長い側に合わせて高さが伸びます。本文は24px、幅359px以下は22pxです。反転中の連打を防ぎ、動きを減らす設定ではアニメーションを省きます。新シリーズは各質問の`followUp`を使い、既存3シリーズは`shared/followups/<series>.json`のID対応から個別の追加質問を読み込みます。深掘りは主質問IDに対応し、主質問を削除・改稿する際は対応も更新します。

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

ユーザーの依頼により、別れを考えた経験、相手の気になるところ、我慢、寂しさ、気持ちの変化、将来への迷い、心に残る言動、自分らしさ、負担、関係を変える希望の10組を追加しました。当時の追加データは`tools/couples-deep-additions.mjs`に履歴として残しています。再生成時は、この追加後に2026-10-25のエピソード置換を適用します。

## CouplesのDeepエピソード（2026-10-25）

初期版のDeep132組を、性別を固定しない架空の恋人同士「アキさん・ユウさん」の出来事として作成しました。その後のユーザー指示で、現在は下記の提供相談12件だけに限定しています。表は具体的な場面と主問い、裏は最初に「あなたはどう考える？」、続いてその相談を軸にした2問を表示します。

CouplesのDeepは深掘りに固定し、会話スタイルの選択欄を表示しません。「さらに話す」でカードが裏返り、同じ出来事の追加質問3問を「次の問いへ」「前の問いへ」で順に考えます。進捗は`1 / 3`の形で表示します。「出来事に戻る」で表を読み返し、再びめくると直前の追加質問から再開できます。途中でも「次の出来事へ」で進めます。CouplesのLiteと他4シリーズは通常・深掘りを選べます。個別深掘りのレビュー状態は変更せず、本番で未承認の場合も最初の共通質問「あなたはどう考える？」を表示します。

追加質問は`shared/followups/couples.json`の`discussionQuestions`で管理し、各配列の先頭は既存の`questions[id]`と一致させます。最初に追加した264問と生成元は`tools/curation-couples-discussions.json`に履歴として残し、その後の実例参考改稿は`tools/curation-couples-researched-episodes.json`で管理します。配列全体が既存のレビューゲートを通った時だけ表示されます。

Liteへの移動16組は`tools/curation-couples-lite-restorations.json`に記録しました。旧ID・主質問・出典・Levelを維持し、深掘りは15組を保持、別れの問いの1組だけ相手の内心を推測する内容から自分の気持ちを振り返る内容へ改稿しています。この移動の段階では元のLite100組とDeep132の出来事を維持していました。現在のDeepは末尾の選択記録の12件だけです。

`node --test tools/couples-deep-episodes.test.mjs`で全Deepの置換・Liteの維持・再生成時の整合性・未承認深掘りの公開ゲートを検証します。

## Couplesの実例・調査を参考にした改稿（2026-10-25）

調査主体の一次発表11件と、公開された当事者インタビュー・体験記6件を本文まで確認し、Deep32場面と追加96問を改稿しました。家賃と通勤、借入や仕送り、見えにくい家事、結婚・子どもの希望、双方の仕事、家族のケア、SNSや位置情報の同意などを扱った段階の履歴です。この時点ではLite116組と残りのDeep100場面を変更しませんでした。

出典・公開日・確認日・調査対象と限界・質問IDとの対応は[`tools/curation-couples-researched-episodes.json`](tools/curation-couples-researched-episodes.json)に記録しています。各改稿では、資料で確認できる論点を`researchBasis`、加えた架空の設定を`fictionalChanges`として分けます。本人の語りは自己申告、調査は記載された母集団と設問の範囲の資料として扱い、カードの対立や会話が実際に起きたとは表示しません。登場人物は架空のアキさん・ユウさんとし、実在人物の年齢・職場・家族の個別事情や原文は移していません。割合や法制度の説明もカードには含めません。

この改稿も編集質問として既存の出典・承認待ち設定を維持します。正本再生成では元のエピソード編集後に改稿を適用し、変更前データが一致しなければ中止します。テストでは出典IDの対応、32組の本文・追加3問、Lite116組と未変更Deep100組のハッシュを検証します。

## 提供された相談画像10件の圧縮（2026-10-25）

ユーザー提供の長い恋愛相談画像10件から、出来事と葛藤を残して主質問を63〜84字、追加質問を各3問へ編集しました。改姓、結婚相手に求めるもの、愛情と触れ合いのずれ、外見と信頼、元恋人への干渉、伝えにくい好み、秘密と合意、裏切られた後の受け止め方を扱います。この段階ではDeepの10枚を置換し、総数132場面とLite116組を維持しました。その後、次節の12件限定を適用しています。

対応する画像番号、入力画像のSHA-256、残した葛藤、省略・脚色した内容、改稿前後は`tools/curation-couples-compressed-episodes.json`に記録しています。原文を検証済みの実話とは扱わず、挨拶・年齢・学歴・侮辱・属性への決めつけ・具体的な性描写・隠蔽や監視の手順は移していません。入力画像そのものや元文全文、端末内の画像パスも収録していません。

再生成では`tools/couples-compressed-episodes.mjs`を実例参考改稿の後に適用します。過去の改稿記録は履歴として保持し、現行データは各段階を順に適用した結果と照合します。

## 現在のDeep：提供相談12件のみ（2026-10-25）

最後のユーザー指示に基づき、先に提供された画像10件と、追加画像「恋人の容姿の好みと推し」・相談文「配信者への個別DM」の2件、計12件だけをDeepに収録します。短すぎるという指摘を受けて11件は経緯・相反する気持ちを100〜120字へ戻し、配信者の相談1件は追加提供文の全文をそのまま収録しています。追加質問は各3問です。ほかの122場面は実行時データから外し、Liteへは移していません。Lite116組はそのままです。

残すID、除外するID、追加2件の参照元、内容の圧縮方針は`tools/curation-couples-deep-selection.json`に記録しています。過去の調査・改稿記録は履歴として保管し、通常の画面からは読み込みません。再生成時もこの選択を適用し、除外した場面が復活しないことをテストします。

提供原文の1問は`source: "user-provided"`、`textFormat: "verbatim-consultation"`で識別し、本文のSHA-256を質問と参照情報に記録します。`tools/couples-provided-content.mjs`でID・全文・作成元・ハッシュが一致した原文だけを、通常の編集文の長さや対象語句の制限から除外します。原文中の主張は検証済みの説明として扱いません。表示文も原文と完全一致させ、末尾の「アドバイスください。」までそのまま表示します。

追加3問は、最初をユーザー指定の「あなたはどう考える？」に統一し、残る2問は直前の版から逐語保持しています。質問ごとの軸は`discussionAxis`、形式は`discussionStyle: "opinion-then-reflection"`に記録し、本文はこの変更で書き換えていません。共通の問いは`sharedDiscussionOpening`で明示し、Couples Deepの先頭に限って同じ文章を許可します。個別の問いやLite、他シリーズの重複検出は維持します。
