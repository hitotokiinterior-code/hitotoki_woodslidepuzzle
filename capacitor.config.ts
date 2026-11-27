import type { CapacitorConfig } from '@capacitor/cli';

// This must match the Bundle ID registered in your Apple Developer account
// / App Store Connect, and the BUNDLE_ID var in codemagic.yaml.
const config: CapacitorConfig = {
  appId: 'com.hitotoki.woodslidepuzzle',
  appName: 'きのはこ', // ホーム画面に出る名前（ストアの名前は App Store Connect 側で「きのはこ - 木箱スライドパズル」）
  webDir: 'www',
  ios: {
    contentInset: 'always',
  },
};

export default config;
