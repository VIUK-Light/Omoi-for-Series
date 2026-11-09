# Omoi Us UI

BIZ UDPGothic（Copyright 2022 The BIZ UDGothic Project Authors）を元にした、Us用のサブセット書体です。SIL Open Font License 1.1で再配布します。[ライセンス全文](OFL.txt)を同梱しています。

画面と316問に使う文字、ASCII、かな・全角文字を収録し、変更版の内部名を「Omoi Us UI」にしています。参加者名などの未収録文字にはOSの日本語書体を使います。外部フォント配信への接続は不要です。

上流は[Google FontsのBIZ UDPGothic](https://github.com/google/fonts/tree/main/ofl/bizudpgothic)です。取り込んだTTFのSHA-256:

- Regular: `258d7156c165f2ff774b6efee637c22c3b950de0d8a10e501137061bc8085d01`
- Bold: `30eba52fc837e8b62c97d4b82e6706583149fb7294e3712dd71a655eaea80a90`

生成にはPythonのfonttoolsとbrotliを使います。上流のTTF2ファイルとOFL.txtを用意して、リポジトリのルートで`python tools/subset-us-fonts.py /path/to/upstream-fonts`を実行します。上流ファイルの照合値が異なる場合は停止します。
