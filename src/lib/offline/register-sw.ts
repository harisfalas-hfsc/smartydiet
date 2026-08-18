/** Service worker registration with auto-update detection. */
let registration: ServiceWorkerRegistration | null = null;

export function registerServiceWorker(onUpdateReady: () => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const register = async () => {
    try {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      if (registration.waiting) onUpdateReady();
      registration.addEventListener("updatefound", () => {
        const next = registration?.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) onUpdateReady();
        });
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

export function applyUpdate() {
  registration?.waiting?.postMessage("SKIP_WAITING");
  navigator.serviceWorker?.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
}

/** Asks the service worker to pre-cache a list of same-origin URLs. */
export function warmUrls(urls: string[]) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "WARM", urls });
}
