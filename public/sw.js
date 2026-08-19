/* SmartyDiet offline service worker.
   Caches the app shell, every visited page, and all static assets so the app
   boots and navigates with zero internet. */
const VERSION = "smartydiet-v4";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const PAGE_CACHE = `${VERSION}-pages`;

const CORE = [
  "/",
  "/about",
  "/how-it-works",
  "/pricing",
  "/faq",
  "/contact",
  "/tools",
  "/tools/bmr-calculator",
  "/tools/calorie-counter",
  "/tools/macro-calculator",
  "/diet-science",
  "/nutrition-intelligence",
  "/glossary",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/auth",
  "/manifest.webmanifest",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        CORE.map((url) =>
          fetch(url, { credentials: "same-origin" })
            .then((res) => (res.ok ? cache.put(url, res.clone()) : undefined))
            .catch(() => undefined),
        ),
      );
      // Silent updates: never ask the user anything.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "WARM" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        await Promise.all(
          event.data.urls.map((url) =>
            fetch(url, { credentials: "same-origin" })
              .then((res) => (res.ok ? cache.put(url, res.clone()) : undefined))
              .catch(() => undefined),
          ),
        );
      })(),
    );
  }
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/__l5e/") ||
    /\.(js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|avif|gif|ico|json|txt)$/i.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) {
    // Refresh in the background, but never block the response.
    fetch(request)
      .then((res) => (res.ok ? cache.put(request, res.clone()) : undefined))
      .catch(() => undefined);
    return hit;
  }
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone()).catch(() => undefined);
  return res;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone()).catch(() => undefined);
    return res;
  } catch (error) {
    const hit = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    if (hit) return hit;
    const shell = await caches.open(SHELL_CACHE);
    const fallback =
      (await shell.match(new URL(request.url).pathname)) || (await shell.match("/"));
    if (fallback) return fallback;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn")) return;
  if (url.pathname.startsWith("/lovable/") || url.pathname.startsWith("/.mcp")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      cacheFirst(request, ASSET_CACHE).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("", { status: 504 });
      }),
    );
  }
});
