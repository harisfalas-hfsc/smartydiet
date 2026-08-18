/**
 * Single source of truth for connectivity across web, PWA and native (Capacitor).
 *
 * Two independent signals are combined:
 *   1. Transport state  — Capacitor Network on native, `navigator.onLine` on the web.
 *   2. Reachability     — a cheap probe against `/api/public/health`.
 *
 * `navigator.onLine` alone is unreliable (native WebViews report `true` in
 * airplane mode; browsers report `true` when the backend is down), so the
 * probe is what promotes the app to a genuinely "online" state.
 */

export type ConnectivityState =
  | "online" // transport up and backend answered
  | "offline" // no transport at all
  | "server-unreachable"; // transport up, backend not answering

type Listener = (online: boolean) => void;
type StateListener = (state: ConnectivityState) => void;

const listeners = new Set<Listener>();
const stateListeners = new Set<StateListener>();

const HEALTH_URL = "/api/public/health";
const PROBE_TIMEOUT_MS = 6000;
const PROBE_INTERVAL_MS = 30_000;
const MIN_PROBE_GAP_MS = 3000;

let transportUp = true;
let state: ConnectivityState = "online";
let started = false;
let lastProbeAt = 0;
let probing: Promise<boolean> | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === "function" ? cap.isNativePlatform() : false;
}

function setState(next: ConnectivityState) {
  if (state === next) return;
  const wasOnline = state === "online";
  state = next;
  const nowOnline = next === "online";
  stateListeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* listener errors never break connectivity */
    }
  });
  if (wasOnline !== nowOnline) {
    listeners.forEach((fn) => {
      try {
        fn(nowOnline);
      } catch {
        /* noop */
      }
    });
  }
}

/** Synchronous, always-safe read. Assumes online during SSR / before boot. */
export function isOnlineNow(): boolean {
  if (typeof window === "undefined") return true;
  if (!started) return isNative() ? transportUp : navigator.onLine !== false;
  return state === "online";
}

export function getConnectivityState(): ConnectivityState {
  if (typeof window === "undefined") return "online";
  return started ? state : isOnlineNow() ? "online" : "offline";
}

export function subscribeConnectivity(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function subscribeConnectivityState(fn: StateListener): () => void {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}

/** Probes the backend. Deduplicated and rate-limited; never throws. */
export async function probeBackend(force = false): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (!transportUp) {
    setState("offline");
    return false;
  }
  if (probing) return probing;
  const now = Date.now();
  if (!force && now - lastProbeAt < MIN_PROBE_GAP_MS) return state === "online";

  probing = (async () => {
    lastProbeAt = Date.now();
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${HEALTH_URL}?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const ok = res.ok;
      setState(ok ? "online" : "server-unreachable");
      return ok;
    } catch {
      setState(transportUp ? "server-unreachable" : "offline");
      return false;
    } finally {
      clearTimeout(abort);
      probing = null;
    }
  })();

  return probing;
}

/** Called by data helpers when a request fails, so the state can catch up fast. */
export function reportRequestFailure() {
  if (typeof window === "undefined") return;
  void probeBackend(true);
}

/** Called by data helpers on a successful request — cheap way back to "online". */
export function reportRequestSuccess() {
  if (typeof window === "undefined") return;
  transportUp = true;
  setState("online");
}

function onTransport(up: boolean) {
  transportUp = up;
  if (!up) {
    setState("offline");
    return;
  }
  void probeBackend(true);
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
      transportUp = status.connected;
      setState(transportUp ? "online" : "offline");
      await mod.Network.addListener("networkStatusChange", (s) => onTransport(s.connected));
      await probeBackend(true);
      schedule();
      return;
    } catch {
      /* plugin missing — fall through to the browser implementation */
    }
  }

  transportUp = navigator.onLine !== false;
  setState(transportUp ? "online" : "offline");
  window.addEventListener("online", () => onTransport(true));
  window.addEventListener("offline", () => onTransport(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void probeBackend(true);
  });
  await probeBackend(true);
  schedule();
}

function schedule() {
  if (timer) return;
  timer = setInterval(() => {
    // Probe often while degraded, lazily while healthy.
    if (state !== "online" || document.visibilityState === "visible") void probeBackend();
  }, PROBE_INTERVAL_MS);
}
