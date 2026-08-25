# Omoi for

このリポジトリは、既存のOmoiとは別の会話プロダクト群を提供します。
リポジトリ名とURLパスは互換性のため`Take-for`のままですが、画面上のブランドはOmoi forです。

- `/couples/` — Omoi for Couples
- `/family/` — Omoi for Family
- `/friends/` — Omoi for Friends

## 既存Omoiとの分離

既存Omoiは、社会・倫理・人生観などの非常に深い問いを扱う独立したプロダクトです。
このリポジトリは既存OmoiのLevel定義・実装・データを共有しません。
同じ1〜4の数値を使っていても、OmoiのLevelとFor SeriesのLevelは別の深さ尺度です。

このリポジトリのFor Series Levelは、Lovesの歴史的な意図をもとにしています。

1. 軽い話 — 気軽に答えられる日常の話題
2. 本音 — お互いの考えや気持ちを知る
3. 少し深い話 — 気持ちや関係、価値観の話
4. デリケートな話 — ふだんは言えない本音を伝える

## Couplesのデータ

`shared/questions/couples.json`には、Lovesの**手書き質問701問**を移行しています。
移行時には、Loves元の`id`・`level`・`category`・質問文を保持し、Levelの再分類や質問文の書き換えを行っていません。

データの`source`は`loves`です。テンプレートから生成されるsupplementalカードは今回の701問には含めていません。

### 正本と再現性

正本ソース、コミットSHA、Git blob SHA、ファイルSHA-256は[`tools/PROVENANCE.md`](tools/PROVENANCE.md)に記録しています。
現在の正本は次のコミット済みblobです。

- Commit: `d98a9c2346c66f9bbc90a7a1eff636f88795cc86`
- Path: `Loveds/web/src/data/cards.ts`
- Blob: `61d01bd7021f19f5bea6f950bd0a428d491e69a3`

移行と監査は恒久的に再実行できます。

```sh
node tools/migrate-loves-couples.mjs /path/to/Loveds_publish/Loveds/web/src/data/cards.ts
node tools/verify-couples-dataset.mjs /path/to/Loveds_publish/Loveds/web/src/data/cards.ts
```

検証では、TypeScriptとJSONのソース構文ではなく、文字列リテラルをデコードしたランタイム値として、`id`・`level`・`text`・`category`を順序を含めて比較します。
期待件数はLevel 1=167、Level 2=169、Level 3=167、Level 4=198です。

## 質問選択

質問は選択中のシリーズとLevelのプールから、使用済みIDを除外してランダムに選びます。
使用履歴はセッション内のメモリにのみ保持し、ページ再読み込みまたはLevel変更でリセットします。
プールを使い切った場合はリセットして続行しますが、可能な場合は直前の質問をリセット直後の抽選から除外します。

## 公開・リリースについて

701問の移行完了は、プロダクション公開の承認を意味しません。
質問内容の監査はリリースゲートです。特に、学生向け・センシティブ・長文シナリオ・個人的な文言を含む質問は、公開前に別途確認してください。

## Family / Friends

FamilyとFriendsの質問データは現在空です。Couplesの質問を機械的に言い換えず、それぞれの関係性に合わせた質問セットを設計します。
