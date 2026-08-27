/** Service worker registration — fully silent and disabled in previews/dev. */
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
const UPDATE_RELOAD_KEY = "smartydiet-update-reload";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorker() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((item) => {
        const worker = item.active ?? item.waiting ?? item.installing;
        return worker ? new URL(worker.scriptURL).pathname === "/sw.js" : false;
      })
      .map((item) => item.unregister()),
  );
}

async function deleteLegacyIdentityCache() {
  if (!("caches" in window)) return;
  await caches.delete("smartydiet-app-identity");
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refused) {
    registrationPromise = Promise.all([unregisterAppWorker(), deleteLegacyIdentityCache()])
      .then(() => null)
      .catch(() => null);
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      await deleteLegacyIdentityCache();
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;

        // The new worker is active, but an already-open tab is still running
        // the previous hashed app bundle. Reload once so every published fix
        // takes effect without asking customers for a hard refresh.
        if (sessionStorage.getItem(UPDATE_RELOAD_KEY) === "1") {
          sessionStorage.removeItem(UPDATE_RELOAD_KEY);
          return;
        }
        sessionStorage.setItem(UPDATE_RELOAD_KEY, "1");
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;
      await registration.update().catch(() => undefined);

      const checkForUpdate = () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          void registration.update().catch(() => undefined);
        }
      };

      window.addEventListener("online", checkForUpdate);
      window.addEventListener("pageshow", checkForUpdate);
      document.addEventListener("visibilitychange", checkForUpdate);

      // Periodic update check (hourly) so long-lived PWA sessions stay fresh.
      window.setInterval(checkForUpdate, 60 * 60 * 1000);
      return registration;
    } catch {
      return null;
    }
  })();
  return registrationPromise;
}

/** Asks the service worker to pre-cache a list of same-origin URLs. */
export async function warmUrls(urls: string[]): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  await caches.open("smartydiet-pages").then(async (cache) => {
    await Promise.allSettled(
      urls.map(async (url) => {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) await cache.put(url, response);
      }),
    );
  });
}
