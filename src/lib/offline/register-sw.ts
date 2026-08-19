/** Service worker registration — fully silent, never prompts the user. */
let registration: ServiceWorkerRegistration | null = null;
let reloadedForUpdate = false;

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const register = async () => {
    try {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      // A brand new worker taking control means the app code changed: reload
      // once, quietly, so the user never sees a stale shell or an update prompt.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadedForUpdate) return;
        reloadedForUpdate = true;
        window.location.reload();
      });
      // Periodic update check (hourly) so long-lived PWA sessions stay fresh.
      window.setInterval(() => registration?.update().catch(() => undefined), 60 * 60 * 1000);
    } catch {
      /* offline or unsupported — ignore */
    }
  };

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register());
}

/** Asks the service worker to pre-cache a list of same-origin URLs. */
export function warmUrls(urls: string[]) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "WARM", urls });
}
