import type { CapacitorConfig } from '@capacitor/cli';

// This must match the Bundle ID registered in your Apple Developer account
// / App Store Connect, and the BUNDLE_ID var in codemagic.yaml.
const config: CapacitorConfig = {
  appId: 'com.hitotoki.woodslidepuzzle',
  appName: '木箱すべりパズル',
  webDir: 'www',
  ios: {
    contentInset: 'always',
  },
};

export default config;
