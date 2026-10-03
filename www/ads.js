/**
 * ads.js — AdMob helper for the wood-box-puzzle Capacitor app.
 *
 * Uses the Capacitor global bridge (window.Capacitor.Plugins.AdMob) instead
 * of ES module imports, so it works as a plain <script> tag with no bundler —
 * matching how the rest of this game is written.
 *
 * On the web (no Capacitor runtime present, e.g. previewing in a browser),
 * every function becomes a harmless no-op, so you can keep testing the game
 * in a normal browser tab without errors.
 *
 * BEFORE SHIPPING: replace TEST_BANNER_ID / TEST_INTERSTITIAL_ID below with
 * your real AdMob ad unit IDs from https://apps.admob.com.
 * Keep using the test IDs during development — Google can suspend accounts
 * that serve real ads to a developer's own device during testing.
 */
(function () {
  "use strict";

  // Google's official iOS test ad unit IDs — safe to leave in during development.
  var TEST_BANNER_ID = "ca-app-pub-3940256099942544/2934735716";
  var TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/4411468910";

  // Real AdMob ad unit IDs (木箱すべりパズル).
  var BANNER_AD_ID = "ca-app-pub-4044413836429156/8030070153";
  var INTERSTITIAL_AD_ID = "ca-app-pub-4044413836429156/5615484797";

  // Show an interstitial every N taps of "ひとつ戻す" (undo).
  var INTERSTITIAL_EVERY_N_UNDOS = 5;
  var UNDO_COUNT_KEY = "wood-puzzle-undo-count";

  function getAdMob() {
    return (
      window.Capacitor &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.AdMob
    );
  }

  var initialized = false;
  var interstitialReady = false;

  async function initAds() {
    var AdMob = getAdMob();
    if (!AdMob || initialized) return;
    initialized = true;
    try {
      await AdMob.initialize({ initializeForTesting: BANNER_AD_ID === TEST_BANNER_ID });
    } catch (e) {
      console.warn("[ads] initialize failed", e);
      return;
    }
    // iOS 14+ App Tracking Transparency prompt. Must be requested before
    // showing personalized ads; AdMob will fall back to non-personalized
    // ads automatically if the user declines.
    try {
      var status = await AdMob.trackingAuthorizationStatus();
      if (status && status.status === "notDetermined") {
        await AdMob.requestTrackingAuthorization();
      }
    } catch (e) {
      // Not available on this platform/version — fine to ignore.
    }
    preloadInterstitial();
  }

  async function showBannerAd() {
    var AdMob = getAdMob();
    if (!AdMob) return;
    try {
      await AdMob.showBanner({
        adId: BANNER_AD_ID,
        adSize: "ADAPTIVE_BANNER",
        position: "BOTTOM_CENTER",
        margin: 0,
      });
    } catch (e) {
      console.warn("[ads] showBanner failed", e);
    }
  }

  async function hideBannerAd() {
    var AdMob = getAdMob();
    if (!AdMob) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      // no-op — banner may not be showing yet
    }
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
    try {
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn("[ads] showInterstitial failed", e);
    } finally {
      preloadInterstitial(); // get the next one ready
    }
  }

  // Call this every time the player clears a level. Shows an interstitial
  // every time (per the current design) — call from wherever the clear
  // screen is dismissed, so the celebratory moment itself isn't interrupted.
  function showInterstitialOnClear() {
    var AdMob = getAdMob();
    if (!AdMob) return; // web preview — do nothing
    showInterstitialAdNow();
  }

  // Call this every time the player taps "ひとつ戻す" (undo). Counts taps in
  // localStorage and only actually shows an ad every INTERSTITIAL_EVERY_N_UNDOS taps.
  function maybeShowInterstitialOnUndo() {
    var AdMob = getAdMob();
    if (!AdMob) return; // web preview — do nothing
    var n = 0;
    try {
      n = parseInt(localStorage.getItem(UNDO_COUNT_KEY) || "0", 10) + 1;
      localStorage.setItem(UNDO_COUNT_KEY, String(n));
    } catch (e) {
      n = INTERSTITIAL_EVERY_N_UNDOS; // if storage fails, just show it
    }
    if (n % INTERSTITIAL_EVERY_N_UNDOS === 0) {
      showInterstitialAdNow();
    }
  }

  // Expose a small global API for index.html / the game script to call.
  window.initAds = initAds;
  window.showBannerAd = showBannerAd;
  window.hideBannerAd = hideBannerAd;
  window.showInterstitialOnClear = showInterstitialOnClear;
  window.maybeShowInterstitialOnUndo = maybeShowInterstitialOnUndo;
})();
