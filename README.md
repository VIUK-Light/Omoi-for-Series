# Omoi for

このリポジトリは、既存のOmoiとは別の会話プロダクト群を提供します。
リポジトリ名とURLパスは互換性のため`Take-for`のままですが、画面上のブランドはOmoi forです。

- `/couples/` — Omoi for Couples
- `/family/` — Omoi for Family
- `/friends/` — Omoi for Friends
- `/howto.html` — Omoi for全体の使い方
- `/couples/howto.html` — Omoi for Couples単体の使い方
- `/family/howto.html` — Omoi for Family単体の使い方
- `/friends/howto.html` — Omoi for Friends単体の使い方

ハブの使い方ページではシリーズ選択から説明し、各シリーズ画面の上部にある「使い方」からは、そのシリーズ専用のガイドを開きます。
そのため、`/couples/`、`/family/`、`/friends/`のURLを単体で共有しても、受け取った人はシリーズ選択なしで使い始められます。
画面下部の`VIUK-Light`は公式Web（`https://viuk-light.org/`）へのリンクです。

## 既存Omoiとの分離

既存Omoiは、社会・倫理・人生観などの非常に深い問いを扱う独立したプロダクトです。
このリポジトリは既存OmoiのLevel定義・実装・データを共有しません。
同じ1〜4の数値を使っていても、OmoiのLevelとFor SeriesのLevelは別の深さレベルです。

このリポジトリのFor Series Levelは、Lovesの歴史的な意図をもとにしています。

1. 軽い話 — 気軽に答えられる日常の話題
2. 本音 — お互いの考えや気持ちを知る
3. 少し深い話 — 気持ちや関係、価値観の話
4. デリケートな話 — ふだんは言えない本音を伝える

## Couplesのデータ

`shared/questions/couples.json`には、Lovesの手書き質問をもとにした**701問**を収録しています。
Loves元の698問は`id`・`level`・`category`・質問文を保持しています。
個人的な固定文言1問と、リリース画面では長すぎるシナリオ2問を公開データから除外し、同じLevel・カテゴリに編集質問3問を追加しています。
この編集は`source: "editorial"`として明示しています。

Loves由来のカードは`source: "loves"`、編集置換は`source: "editorial"`です。
テンプレートから生成されるsupplementalカードは今回の701問には含めていません。

### 正本と再現性

正本ソース、コミットSHA、Git blob SHA、ファイルSHA-256は[`tools/PROVENANCE.md`](tools/PROVENANCE.md)に記録しています。
現在の正本は次のコミット済みblobです。

- Commit: `d98a9c2346c66f9bbc90a7a1eff636f88795cc86`
- Path: `Loveds/web/src/data/cards.ts`
- Blob: `61d01bd7021f19f5bea6f950bd0a428d491e69a3`

移行と監査は恒久的に再実行できます。

```sh
node tools/migrate-loves-couples.mjs /path/to/Loveds_publish/Loveds/web/src/data/cards.ts --release
node tools/verify-couples-dataset.mjs /path/to/Loveds_publish/Loveds/web/src/data/cards.ts
node tools/verify-series-datasets.mjs
```

`--canonical`を指定すると、正本701問の抽出だけを検証し、公開用JSONは変更しません。
通常の`--release`では、個人的な固定文言と長大なシナリオを除外した698問と編集質問3問を出力します。
検証では、TypeScriptとJSONのソース構文ではなく、文字列リテラルをデコードしたランタイム値として、Loves 698問の`id`・`level`・`text`・`category`を順序を含めて比較します。
期待件数はLevel 1=167、Level 2=169、Level 3=167、Level 4=198です。

## 質問選択

質問は選択中のシリーズとLevelのプールから、使用済みIDを除外してランダムに選びます。
使用履歴はセッション内のメモリにのみ保持し、ページ再読み込みまたはLevel変更でリセットします。
プールを使い切った場合はリセットして続行しますが、可能な場合は直前の質問をリセット直後の抽選から除外します。
Level選択後は3 / 5 / 10 / 15問のセッション数を選べます。質問画面では「今回は話さない」で現在の問いを飛ばせます。

## 公開・リリースについて

701問の移行完了は、プロダクション公開の承認を意味しません。
質問内容の監査はリリースゲートです。特に、学生向け・センシティブ・長文シナリオ・個人的な文言を含む質問は、公開前に別途確認してください。

## Family / Friends

FamilyとFriendsには、それぞれLevel 1〜4を50問ずつ、合計200問の編集質問を収録しています。
Couplesの質問を機械的に言い換えず、家族・友達それぞれの関係性に合わせて設計しています。
