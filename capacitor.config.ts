import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS / Android wrapper configuration.
 *
 * The wrapper is intentionally thin: it ships the SAME built web app from the
 * device (webDir), so the native app boots from local assets and keeps working
 * offline. No `server.url` is set on purpose — pointing the WebView at the live
 * site would make every cold start depend on the network.
 *
 * Backend calls are rewritten to the published origin by src/lib/platform
 * (override with VITE_API_ORIGIN at build time).
 */
const config: CapacitorConfig = {
  appId: "com.smartywellness.smartydiet",
  appName: "SmartyDiet",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: "#0b1220" },
  },
};

export default config;
