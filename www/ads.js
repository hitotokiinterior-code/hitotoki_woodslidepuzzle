/**
 * ads.js — AdMob helper for the wood-box-puzzle Capacitor app.
 *
 * Capacitorのグローバルブリッジ (window.Capacitor.Plugins.AdMob) を使うので、
 * バンドラ無しの <script> タグだけで動きます。
 * ブラウザ(Capacitorなし)で開いた場合は、すべての関数が何もしません。
 *
 * 変更点:
 *  - 初期化の完了を待ってからバナー/インタースティシャルを出す
 *  - バナーの高さ分だけ画面下に余白を作る（ボタンと重ならない）
 *  - 全画面広告は「ひとつ戻す」では出さない。クリア3回に1回、かつ前回から90秒以上
 *  - バナーの二重表示を防止
 */
(function () {
  "use strict";

  // Google公式のiOSテスト広告ID（開発中はこちらに切り替えると安全）
  var TEST_BANNER_ID = "ca-app-pub-3940256099942544/2934735716";
  var TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/4411468910";

  // 本番の広告ユニットID（木箱すべりパズル）
  var BANNER_AD_ID = "ca-app-pub-4044413836429156/8030070153";
  var INTERSTITIAL_AD_ID = "ca-app-pub-4044413836429156/5615484797";

  // 全画面広告の頻度
  var INTERSTITIAL_EVERY_N_CLEARS = 3;   // クリア3回に1回
  var INTERSTITIAL_MIN_INTERVAL_MS = 90 * 1000; // 前回表示から最低90秒
  var CLEAR_COUNT_KEY = "wood-puzzle-clear-count";

  // バナーの高さは CSS変数 --ad-h に入れる。
  // 画面下の余白は style.css が --ad-h を使って確保している。
  // ここではクリア画面(#win)だけ、バナーに隠れないよう余白を足す。
  var style = document.createElement("style");
  style.textContent =
    "#win{padding-bottom:calc(20px + var(--ad-h, 0px)) !important}";
  document.head.appendChild(style);
  function setAdHeight(px) {
    document.documentElement.style.setProperty("--ad-h", (px || 0) + "px");
  }

  function getAdMob() {
    return (
      window.Capacitor &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.AdMob
    );
  }

  var readyPromise = null;
  var bannerShown = false;
  var interstitialReady = false;
  var lastInterstitialAt = 0;

  // 初期化は1回だけ。完了したら true、失敗したら false で解決する
  function initAds() {
    if (readyPromise) return readyPromise;
    var AdMob = getAdMob();
    if (!AdMob) {
      readyPromise = Promise.resolve(false);
      return readyPromise;
    }
    readyPromise = (async function () {
      try {
        await AdMob.initialize({
          initializeForTesting: BANNER_AD_ID === TEST_BANNER_ID,
        });
      } catch (e) {
        console.warn("[ads] initialize failed", e);
        return false;
      }

      // iOS14+ のATT（トラッキング許可）ダイアログ
      try {
        var status = await AdMob.trackingAuthorizationStatus();
        if (status && status.status === "notDetermined") {
          await AdMob.requestTrackingAuthorization();
        }
      } catch (e) {
        // 対応していない環境では無視
      }

      // バナーのサイズが決まったら、その高さぶん余白を取る
      try {
        AdMob.addListener("bannerAdSizeChanged", function (info) {
          if (info && info.height) setAdHeight(info.height);
        });
      } catch (e) {}

      preloadInterstitial();
      return true;
    })();
    return readyPromise;
  }

  async function showBannerAd() {
    var AdMob = getAdMob();
    if (!AdMob || bannerShown) return;
    var ok = await initAds();
    if (!ok) return;
    bannerShown = true;
    try {
      await AdMob.showBanner({
        adId: BANNER_AD_ID,
        adSize: "ADAPTIVE_BANNER",
        position: "BOTTOM_CENTER",
        margin: 0,
      });
    } catch (e) {
      bannerShown = false;
      console.warn("[ads] showBanner failed", e);
    }
  }

  async function hideBannerAd() {
    var AdMob = getAdMob();
    if (!AdMob || !bannerShown) return;
    bannerShown = false;
    setAdHeight(0);
    try {
      await AdMob.hideBanner();
    } catch (e) {}
  }

  async function preloadInterstitial() {
    var AdMob = getAdMob();
    if (!AdMob) return;
    try {
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID });
      interstitialReady = true;
    } catch (e) {
      interstitialReady = false;
      console.warn("[ads] prepareInterstitial failed", e);
    }
  }

  async function showInterstitialAdNow() {
    var AdMob = getAdMob();
    if (!AdMob || !interstitialReady) return;
    interstitialReady = false;
    lastInterstitialAt = Date.now();
    try {
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn("[ads] showInterstitial failed", e);
    } finally {
      preloadInterstitial(); // 次の広告を先読み
    }
  }

  // クリア画面を閉じるタイミングで呼ばれる。
  // クリア3回に1回、かつ前回の全画面広告から90秒以上たっているときだけ表示。
  function showInterstitialOnClear() {
    if (!getAdMob()) return;
    var n = 0;
    try {
      n = parseInt(localStorage.getItem(CLEAR_COUNT_KEY) || "0", 10) + 1;
      localStorage.setItem(CLEAR_COUNT_KEY, String(n));
    } catch (e) {
      return; // 保存できないときは広告を出さない（連続表示の防止）
    }
    if (n % INTERSTITIAL_EVERY_N_CLEARS !== 0) return;
    if (Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) return;
    showInterstitialAdNow();
  }

  // 「ひとつ戻す」では全画面広告を出さない（index.html側の呼び出しはそのまま残してOK）
  function maybeShowInterstitialOnUndo() {}

  window.initAds = initAds;
  window.showBannerAd = showBannerAd;
  window.hideBannerAd = hideBannerAd;
  window.showInterstitialOnClear = showInterstitialOnClear;
  window.maybeShowInterstitialOnUndo = maybeShowInterstitialOnUndo;
})();
