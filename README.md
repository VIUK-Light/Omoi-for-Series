# Omoi for Series

身近な人と話す、ひとりで振り返る。それぞれの目的に合わせた質問カードです。

## Omoi for Us v3

**相手の選択を予想して、まだ知らない一面に出会う。**

Family／Friendsを「Omoi for Us」に統合しました。2〜6人、スマホ1台。主役の答えを口頭や指で予想し、条件が変わったらもう一度考えるゲームです。

- 家族用166問・友人用150問を、すべて個別にゲーム向けへ改稿。
- 主役以外の的中者に、通常・条件変更後のそれぞれ1点。全員が1回ずつ主役になると終了。
- 予想は端末への入力不要。端末では主役の選択と的中者を記録します。
- パス、途中終了、同じタブでの再開に対応。アカウント・部屋作成・サーバーへの回答送信はありません。

Usは**未公開の開発プレビュー**です。このブランチを取得し、次の方法で確認できます。

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

[シリーズ一覧](http://127.0.0.1:4174/) · [Usを遊ぶ](http://127.0.0.1:4174/us/) · [Usの遊び方](us/howto.html) · [設計とデータの由来](docs/us-v3.md)

[開始画面](docs/screenshots/us-v3-setup.png) · [条件変更の画面](docs/screenshots/us-v3-condition.png) · [得点の画面](docs/screenshots/us-v3-score.png)

`file://`ではJavaScriptモジュールとJSONを読み込めないため、HTTP経由で開きます。Usの未承認データは本番ホストでは遊べません。

## シリーズと移行先

| シリーズ | URL | 状態 |
|---|---|---|
| Omoi for Us | `/us/` | 開発プレビュー：家族用／友人用 |
| Couples | `/couples/` | 継続 |
| Adults | `/adults/` | 継続・18歳以上向け |
| Self-Care | `/self-care/` | 継続・ひとり用 |
| Family | `/family/` | Usの家族用へ移行案内 |
| Friends | `/friends/` | Usの友人用へ移行案内 |

共通基盤を含む旧版は、GitHubの[`archive/family-friends-before-us-v3`](https://github.com/VIUK-Light/Omoi-for-Series/tree/archive/family-friends-before-us-v3)タグに保存しています。Family／Friendsの元の質問、深掘り、表示文もリポジトリ内に保持しています。

既存の[Omoi](https://github.com/VIUK-Light/Omoi)とは別のプロダクトです。Omoi本体のLevel定義や質問データを、このシリーズと共用しません。

## データと検証

```sh
npm ci
npm test
npm run verify:data
npx playwright install chromium
npm run test:e2e
```

[Usの改稿記録](tools/us-edits/)は、保存時点の元データと本文ハッシュを使って全316問の対応を検証します。生成・検証は公開や承認を行いません。

```sh
node tools/build-us-dataset.mjs
node tools/build-us-dataset.mjs --check
node tools/verify-us-dataset.mjs
```

[既存データの正本・生成元・承認・再生成手順](docs/legacy-data-maintenance.md)も参照できます。Couples、Adults、Self-Careのデータと承認状態は維持しています。

[カード表示の確認](tools/card-preview.html)には、`node tools/card-preview.mjs`を使います。これはUsのゲームではなく、保存された既存カードを確認するための画面です。

## 公開

ビルド工程のない静的サイトです。この作業は`codex/omoi-for-us-v3`ブランチ上で行います。mainやGitHub Pagesの公開元、DNSは切り替えません。Usを公開する変更では、全改稿データのレビューと公開設定を整合させてください。
