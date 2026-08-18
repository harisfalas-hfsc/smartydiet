/**
 * Single source of truth for connectivity across web, PWA and native (Capacitor).
 *
 * Root cause this fixes: `navigator.onLine` is unreliable inside a native
 * WebView (Android/iOS often report `true` in airplane mode, or `false` right
 * after boot before the WebView attaches to the network stack). When the app
 * runs natively we listen to `@capacitor/network` instead and keep a cached
 * synchronous flag every other module can read.
 */

type Listener = (online: boolean) => void;

const listeners = new Set<Listener>();
let cached = true;
let started = false;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === "function" ? cap.isNativePlatform() : false;
}

function emit(online: boolean) {
  if (cached === online) return;
  cached = online;
  listeners.forEach((fn) => {
    try {
      fn(online);
    } catch {
      /* listener errors never break connectivity */
    }
  });
}

/** Synchronous, always-safe read. Assumes online during SSR / before boot. */
export function isOnlineNow(): boolean {
  if (typeof window === "undefined") return true;
  if (!started) {
    // Browsers/PWA: navigator.onLine is good enough until initConnectivity runs.
    if (!isNative()) return navigator.onLine !== false;
    return cached;
  }
  return cached;
}

export function subscribeConnectivity(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Must run once, as early as possible in app boot (before any data read),
 * so the very first render already knows the real connectivity state.
 */
export async function initConnectivity(): Promise<void> {
  if (typeof window === "undefined" || started) return;
  started = true;

  if (isNative()) {
    try {
      type NetworkStatus = { connected: boolean };
      type NetworkPlugin = {
        getStatus: () => Promise<NetworkStatus>;
        addListener: (
          event: "networkStatusChange",
          cb: (status: NetworkStatus) => void,
        ) => Promise<unknown>;
      };
      // Resolved at runtime only: the plugin exists in the native build, not on the web.
      const spec = "@capacitor/network";
      const mod = (await import(/* @vite-ignore */ spec)) as { Network: NetworkPlugin };
      const status = await mod.Network.getStatus();
      cached = status.connected;
      emit(status.connected);
      await mod.Network.addListener("networkStatusChange", (s) => emit(s.connected));
      return;
    } catch {
      /* plugin missing — fall through to the browser implementation */
    }
  }


  cached = navigator.onLine !== false;
  window.addEventListener("online", () => emit(true));
  window.addEventListener("offline", () => emit(false));
}
