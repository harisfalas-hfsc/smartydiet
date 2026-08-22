/**
 * Hidden QA gesture: tap the logo 5 times within 3 seconds to open the offline
 * diagnostics panel. Counter lives in sessionStorage so it survives the reload
 * the logo triggers on the home page.
 */
const KEY = "smartydiet.debug.taps";
const WINDOW_MS = 3000;
const REQUIRED = 5;

/** Returns true when the gesture completed (caller should open diagnostics). */
export function registerDebugTap(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as { count: number; at: number }) : null;
    const count = prev && now - prev.at < WINDOW_MS ? prev.count + 1 : 1;
    if (count >= REQUIRED) {
      sessionStorage.removeItem(KEY);
      return true;
    }
    sessionStorage.setItem(KEY, JSON.stringify({ count, at: now }));
  } catch {
    /* noop */
  }
  return false;
}
