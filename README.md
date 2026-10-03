# 木箱すべりパズル — iOS化 スターター一式

今のゲーム(`www/index.html`)を、Capacitorでネイティブ化し、AdMob広告を入れて、
Codemagicでビルド〜TestFlight配信まで自動化するための雛形です。

## フォルダ構成

```
capacitor-app/
├── package.json          npm依存関係(Capacitor + AdMobプラグイン)
├── capacitor.config.ts   アプリID・表示名・webDirの設定
├── codemagic.yaml        Codemagic用のビルド/配信パイプライン
└── www/
    ├── index.html        ゲーム本体(ads.jsの呼び出しを追加済み)
    └── ads.js            AdMobのバナー・インタースティシャル制御
```

## 1. ローカルでやること(Xcodeは使いません)

このプロジェクトは **Xcodeを一切開かずに** iOSアプリをビルドできるように組んであります。
`ios/` フォルダ自体、Codemagicのビルド時に自動生成されるので、あなたの手元の作業は
**テキストファイルを編集してGitHubにpushするだけ**です。

編集するのは次の3ファイルだけ:
- `www/ads.js` — 広告ユニットID
- `capacitor.config.ts` — アプリのBundle ID
- `codemagic.yaml` — Bundle IDの文字列(1箇所、`vars:` の中)

ゲーム自体の動作確認は、`www/index.html` を普通にブラウザで開けばOKです
(広告部分は何もしない安全な処理になっているので、今まで通り遊べます)。

## 2. アプリIDを決める

- [x] `capacitor.config.ts` の `appId` は `com.hitotoki.woodslidepuzzle` に設定済みです。
- [x] `codemagic.yaml` の `BUNDLE_ID` も同じ値に設定済みです。
- このBundle IDで、Apple Developer / App Store Connect にアプリを登録します
  (Codemagicでの自動配信には、事前にApp Store Connect側でアプリレコードを
  作成しておく必要があります)。

## 3. AdMobの広告ユニットIDを設定する

1. https://apps.admob.com でiOS用アプリを登録し、バナーとインタースティシャルの
   広告ユニットをそれぞれ作成します。
2. `www/ads.js` の上の方にある、以下の2行を自分のIDに差し替えます。

   ```js
   var BANNER_AD_ID = TEST_BANNER_ID;        // ← ここを実際のバナーIDに
   var INTERSTITIAL_AD_ID = TEST_INTERSTITIAL_ID; // ← ここを実際のインタースティシャルIDに
   ```

   **開発中は差し替えずテストIDのままにしてください。** 自分の端末で本番広告を
   表示させると、Googleに不正クリックとみなされアカウント停止のリスクがあります。
3. `GADApplicationIdentifier`(広告ユニットIDとは別の、AdMobの「アプリ設定」ページに
   ある「アプリID」)は、**Xcodeで`Info.plist`を直接編集する必要はありません。**
   Codemagic側がビルドのたびに自動で差し込みます(`codemagic.yaml` 内の
   `Inject AdMob App ID...` というステップ)。あなたがやることは、Codemagicの
   管理画面で環境変数 `ADMOB_APP_ID` にこのアプリIDをセットするだけです
   (手順は5章を参照)。

## 4. 広告の表示タイミング(すでに実装済み)

`ads.js` と `www/index.html` に、以下のタイミングで広告を呼ぶ処理を入れてあります。

| タイミング | 動作 |
|---|---|
| ゲーム起動時 | `initAds()` — AdMob初期化 + iOSのトラッキング許可ダイアログ |
| レベル選択画面を開いたとき | `showBannerAd()` — 画面下にバナー表示 |
| レベルをプレイ中 | `showBannerAd()` — 画面下にバナー表示(選択画面と同じく常時表示) |
| 「ひとつ戻す」を5回使ったとき | `maybeShowInterstitialOnUndo()` — 5回ごとにインタースティシャルを表示 |
| クリア画面を閉じたとき(毎回) | `showInterstitialOnClear()` — インタースティシャルを表示 |

「ひとつ戻す」の頻度(5回に1回)は `ads.js` の `INTERSTITIAL_EVERY_N_UNDOS` で変更できます。
クリア時は毎回表示される設定です(頻度を変えたい場合は `showInterstitialOnClear()` の
呼び出し側、または `ads.js` 側にカウンターを足してください)。
ブラウザでプレビューしているとき(Capacitor環境がないとき)は、これらは全部
何もしない安全な処理になるので、今まで通りブラウザでも動作確認できます。

## 5. Codemagicでの自動ビルド・配信

1. このフォルダをGitリポジトリにして、GitHub等にpush。
2. [Codemagic](https://codemagic.io) にログインし、そのリポジトリを連携。
3. App Store Connectで **App Store Connect APIキー** を発行(管理者権限が必要・
   Users and Access > Integrations > App Store Connect API)。
4. Codemagicの Team settings > Integrations > App Store Connect で、
   ダウンロードした `.p8` キーを登録。名前は `codemagic.yaml` 内の
   `api_key: codemagic_api_key` と合わせてください(名前は自由に変更可)。
5. `ADMOB_APP_ID` はすでに `codemagic.yaml` に本番の値(`ca-app-pub-4044413836429156~5152450361`)
   を直接書き込み済みです。広告ユニットIDと同じく、アプリIDはそれ自体では悪用されにくい
   値なので、リポジトリに直接含めても問題ありません。(非公開にしたい場合だけ、
   Codemagicのアプリ設定 > Environment variables に移してもOKです。その場合は
   `codemagic.yaml` 側の値を削除してください。)
6. `main` ブランチにpushすると、`codemagic.yaml` の設定に沿って自動ビルドされ、
   TestFlightにアップロードされます(`submit_to_app_store: false` なので、
   本番配信はまだ手動確認が必要な状態になっています)。

## 6. 審査に出す前のチェックリスト

- [x] `ads.js` のIDを本番の広告ユニットIDに差し替え済み
- [x] `codemagic.yaml` の `ADMOB_APP_ID` を本番値に差し替え済み
- [ ] App Store Connectの「プライバシー情報」で、広告・トラッキングに関する
      項目を申告した
- [ ] TestFlightで実機確認して、広告がゲーム操作の邪魔をしていないか確認した
- [ ] `codemagic.yaml` の `submit_to_app_store` を `true` にする(自動審査提出
      したい場合のみ)
