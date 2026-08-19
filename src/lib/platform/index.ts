/**
 * Thin platform layer.
 *
 * ONE codebase runs on: desktop web, mobile web, installed PWA and — later —
 * the native iOS/Android wrappers (Capacitor WebView). Nothing in the app is
 * allowed to branch on the platform directly; everything goes through here.
 *
 * The only real difference between the web build and the native build is
 * WHERE the backend lives:
 *   - web / PWA : the app is served from the same origin as the API → relative URLs.
 *   - native    : the app is served from the device (capacitor://localhost or
 *                 https://localhost), so every server call needs an absolute
 *                 origin. Local reads never touch the network, so the app still
 *                 boots and works fully offline.
 */

export type PlatformName = "web" | "pwa" | "ios" | "android";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True inside an iOS/Android WebView wrapper. Always false on the web. */
export function isNativePlatform(): boolean {
  const cap = capacitor();
  return typeof cap?.isNativePlatform === "function" ? cap.isNativePlatform() : false;
}

/** True when running as an installed PWA (standalone display mode). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return (
    iosStandalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches)
  );
}

export function getPlatform(): PlatformName {
  const cap = capacitor();
  if (isNativePlatform()) {
    const name = cap?.getPlatform?.();
    if (name === "ios" || name === "android") return name;
  }
  return isStandalone() ? "pwa" : "web";
}

/**
 * Absolute origin of the backend.
 *
 * Empty string on web/PWA (same origin). On native it must be the published
 * site, because the WebView origin is the device itself.
 */
export function getApiOrigin(): string {
  if (!isNativePlatform()) return "";
  const configured = import.meta.env["VITE_API_ORIGIN"] as string | undefined;
  return (configured || "https://smartydiet.com").replace(/\/$/, "");
}

/** Resolves an app-relative path against the correct origin for this platform. */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = getApiOrigin();
  if (!origin) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Fetch used by TanStack server functions (wired in src/start.ts).
 * On web it is plain `fetch`; on native it rewrites the relative
 * `/_serverFn/...` URL onto the real backend origin. Same business logic,
 * same server functions, no second implementation.
 */
export const platformFetch: typeof fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/")) {
    return fetch(apiUrl(input), init);
  }
  if (input instanceof URL && input.origin === "null") {
    return fetch(apiUrl(input.pathname + input.search), init);
  }
  if (input instanceof Request && input.url.startsWith("/")) {
    return fetch(new Request(apiUrl(input.url), input), init);
  }
  return fetch(input as RequestInfo, init);
};

/**
 * Capability probe for features that need a native bridge later
 * (push, camera, biometrics, share, deep links). The core app must keep
 * working when a capability is absent — never duplicate app logic for native.
 */
export function hasNativeBridge(plugin: string): boolean {
  const cap = capacitor() as unknown as { Plugins?: Record<string, unknown> } | undefined;
  return Boolean(cap?.Plugins?.[plugin]);
}
