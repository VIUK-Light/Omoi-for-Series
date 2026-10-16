# Loves データ正本ソース(Provenance)

Omoi for Couples(`shared/questions/couples.json`)のLoves由来質問は、
以下の **Loves リポジトリのコミット済み Git blob** から抽出しています。
公開用JSONは正本701問を維持し、Couples向けに整理した222問です（Loves由来95・編集127）。2026-10-16に旧477問を全件確認し、255問を削除、113問を改稿、2組の深掘りのみ改稿、107組を維持しました。正本は変更せず、追加の除外・改稿をリリースポリシーに適用します。全件の理由と変更前後は`tools/curation-couples.json`に記録しています。

## カノニカルソース

| 項目 | 値 |
| --- | --- |
| ソースリポジトリ(ローカル) | `/Volumes/SSD/Workspace/Projects/Loveds_publish` |
| リモート | `loveds-origin = https://github.com/VIUK-XV/Loveds.git`(作業ブランチの origin は `VIUK-XV/Playground.git`) |
| カノニカルコミット | `d98a9c2346c66f9bbc90a7a1eff636f88795cc86` |
| コミット日時 | 2026-08-21 22:33:32 +0900「Refine Loveds app flow and secure AI proxy usage」 |
| パス(当該コミット内) | `Loveds/web/src/data/cards.ts` |
| Git blob SHA-1 | `61d01bd7021f19f5bea6f950bd0a428d491e69a3` |
| ファイル SHA-256 | `8157d9f273edf58dd011db8627c16dd110a49d81e76577672502dc4cd47bfc57` |
| バイト数 | 131,386 bytes |

検証コマンド:

```sh
git -C /Volumes/SSD/Workspace/Projects/Loveds_publish show d98a9c2:Loveds/web/src/data/cards.ts \
  | shasum -a 256
# => 8157d9f273edf58dd011db8627c16dd110a49d81e76577672502dc4cd47bfc57
```

## 交差検証(系統の異なるブランチでも同一内容)

別系統ブランチ `loveds-main`(`c6a6b2a1307279a27e09676d37dec8da737b5758`)では
同じ内容が `web/src/data/cards.ts` という別パスで存在し、SHA-256 が一致します。
すなわち 2 系統が同一 blob を指しており、正本性が高い。

```sh
git -C /Volumes/SSD/Workspace/Projects/Loveds_publish show c6a6b2a:web/src/data/cards.ts \
  | shasum -a 256
# => 同一ハッシュ
```

## 抽出範囲

- 対象は `cards.ts` 内の**手書き静的カード配列 701 問のみ**。
  テンプレート生成カード(`supplementalTemplates` × `supplementalTopics`、約3,200問)は
  移行対象外(品質均一でノイズが多いため。将来必要なら同ファイルから決定論的に再生成可能)。
- 正本の手書き静的配列701問は、ハッシュ照合後にLevel別件数とランタイム上の文字列値を確認します。
  公開用デッキでは、保持するLoves由来456問のid・level・text・categoryを正本と照合します。
- `love-1-3`は公開データから除外し、`editorial-couples-1-1`(source=`editorial`)で置換。
  固定の個人名・個人的なメッセージをプロダクトの正本データへ残さないためのリリースキュレーションです。
- `ethics-max-4-14`と`ethics-max-4-15`は公開画面で過度に長く、学校内のセンシティブな状況説明も含むため除外。
  `editorial-couples-4-2`と`editorial-couples-4-3`で、問いの構造を保った短い編集質問に置換。
- `schoolLife`、`schoolSelf`、`studyFuture`、`schoolPredictions`、`teacherReport`、`elementaryPredictions`は、学校在籍や特定の学校経験を前提とするため、カテゴリ単位で公開対象から除外。
- 学校や中学生を前提とする個別質問、過去の交際歴やスマートフォンの監視を促しかねない質問、第三者の話を暴露する質問、重複質問も除外。性別・特定アプリを前提にする表現など31問は`editorial-couples-review-001`〜`031`として編集し、`source: "editorial"`で明示。
- 除外ID・除外カテゴリ・編集文面の正本は[`couples-release-policy.mjs`](couples-release-policy.mjs)。移行スクリプトと監査スクリプトの両方が同じ方針を読み込みます。
- `followUps` フィールドは型宣言のみで実データ 0 件のため移行対象外。

## Level に関する重要な注意

- Loves の Level(1–4)と既存 Omoi の Level(1–4)は**意味的に別物**。
- 過去に Loves → Omoi 移行(Omoi repo commit `1536dbf`, 2026-08-23)があり、
  Omoi L1 には Loves L1×41/L2×66/L3×62/L4×1 が混在する非単調な再配置だった。
- **Omoi 側の Level から Loves 元 Level を推測してはならない。**
  本プロジェクトの Level は常に上記カノニカル blob の値を正とする。

## 再生成方法

```sh
node tools/migrate-loves-couples.mjs <cards.ts へのパス> --release
node tools/verify-couples-dataset.mjs <cards.ts へのパス> shared/questions/couples.json
```

`--canonical`は正本701問を抽出検証するだけで、公開JSONを書き換えない。
入力ファイルは SHA-256 でカノニカル blob と照合され、不一致の場合は失敗する。


## 追加したAI生成案（2026-10-15）

ユーザーの許可によりCodex / GPT-6が生成しました。Grok生成とは扱いません。Adults64組とSelf-Care64組はメイン質問と各組固有の深掘りを持ちます。現在はシリーズ適合性を確認したCouples222・Family166・Friends150の主質問に対応する538文を`shared/followups/`に分離しています。

全件`stage: ai-initial-draft`、`reviewStatus: pending`です。AIの相互チェックで誘導・経験の決めつけ・不自然な文章を修正しましたが、人が承認したとは記録しません。ローカル用の明示フラグとホスト判定が成立した場合のみ、レビュー前のカードを試せます。生成元・レビュー前のラベルはユーザー指示により画面に表示せず、状態はデータ側で保持します。新2シリーズの本番公開状態は`unpublished`です。

`node tools/verify-followups.mjs`でID対応、欠落、重複、表現、作成元を検証します。


## ユーザー提供のAdults追加30組（2026-10-16）

ユーザーの取り込み許可を受け、提供された30組の本文・深掘り文を一字も変更せずに追加しました。Adultsは94組です。追加分は`user-provided` / `provided-draft`としてAIが新規生成した64組と分離し、原文中の作成元表記は`source.original`に申告値として保持します。本文と深掘り文のSHA-256を検証し、取り込み前後の一致を確認しています。公開設定とレビュー状態は自動承認しません。
