# Loves データ正本ソース(Provenance)

Omoi for Couples(`shared/questions/couples.json`)のLoves由来質問は、
以下の **Loves リポジトリのコミット済み Git blob** から抽出しています。
公開用JSONには、個人的な固定文言を除外した700問と、同じLevel・カテゴリの編集質問1問を収録しています。

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
- Loves由来700問のLevel・テキスト・id・categoryは**元データの値をそのまま凍結**(TypeScript/JSON の構文差は不問。
  ランタイム上のデコード済み文字列値の一致をもって verbatim と定義)。
- `love-1-3`は公開データから除外し、`editorial-couples-1-1`(source=`editorial`)で置換。
  固定の個人名・個人的なメッセージをプロダクトの正本データへ残さないためのリリースキュレーションです。
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
