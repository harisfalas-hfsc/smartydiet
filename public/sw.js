/* SmartyDiet service worker — network only, no offline mode.
 *
 * It exists solely so the app stays installable. It never caches anything and
 * it deletes every cache left behind by previous versions, so every visit from
 * desktop, mobile, tablet or the installed app always loads the freshest
 * published build.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// No fetch handler: every request goes straight to the network.
