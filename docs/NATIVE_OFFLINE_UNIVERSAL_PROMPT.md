# Native + PWA Offline Hardening (portable prompt)

Applies to SmartyDiet and every sister app. Goal: identical offline behaviour on
website, installed PWA, desktop/laptop/tablet, and the native (Capacitor) app.

## The 4 root causes of a blank / "ERR_INTERNET_DISCONNECTED" native screen

1. **The native app loads a remote URL.** If `capacitor.config.ts` sets
   `server.url`, the WebView fetches the site over the network on every launch,
   so airplane mode shows the WebView network error page. There is no JS to run,
   so no offline code can help.
2. **`navigator.onLine` is trusted.** Inside a WebView it lies (often `true` in
   airplane mode, `false` for a moment after boot). Connectivity must come from
   `@capacitor/network` when native.
3. **Boot order.** Data reads and auth gates run before connectivity is known,
   so the first paint takes the "online" path, throws, and blanks.
4. **Session is only in memory / network-verified.** Auth must restore from the
   locally stored session snapshot before any protected route renders.

## Single connectivity source (implemented)

`src/lib/offline/connectivity.ts`

- `initConnectivity()` — call once, first thing at boot. Native: reads
  `Network.getStatus()` and subscribes to `networkStatusChange`. Web/PWA: falls
  back to `online`/`offline` window events.
- `isOnlineNow()` — synchronous cached read, SSR-safe.
- `subscribeConnectivity(cb)` — change notifications.

Every consumer now goes through it: `useOnlineStatus`, `lib/offline/store.ts`
(`isOnline`), `lib/offline/queue.ts`, `hooks/useAuth`, `routes/auth.tsx`,
`routes/_authenticated/route.tsx`, `components/offline/OfflineBootstrap.tsx`.
**Never** read `navigator.onLine` directly again.

## Boot order

1. `initConnectivity()` (awaited)
2. restore local session (`lib/offline/credentials.ts` → `getOfflineSession`)
3. register the service worker (web/PWA only) and prefetch (`OfflineBootstrap`)
4. render routes — auth gate accepts the cached session when offline

## Data layer

All reads go through `offlineFirst(key, loader, userId)` in
`src/lib/offline/store.ts` (IndexedDB, user-scoped envelopes). Writes that are
safe offline are queued in `src/lib/offline/queue.ts` and replayed when
connectivity returns. Member state keys are protected from cache trimming.

## capacitor.config.ts rule

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smarty.diet",
  appName: "SmartyDiet",
  webDir: "dist",       // bundled local shell — REQUIRED
  // server: { url: ... } ❌ NEVER in a shipped build (dev live-reload only)
};
export default config;
```

The native build must ship a **bundled local shell**: an `index.html` + assets
inside the app package, so launch never touches the network.

## PWA config

- `public/manifest.webmanifest`: standalone display, maskable icons.
- `public/sw.js`: precache app shell + routes, network-first for navigations
  with cache fallback, cache-first for hashed assets, and `WARM` messages to
  pre-cache member pages. Registered only in production.

## Native setup + verification steps

```bash
npm i @capacitor/core @capacitor/cli @capacitor/network
npx cap init            # appId/appName as above, webDir: dist
npm run build           # produces the local shell
npx cap add ios
npx cap add android
npx cap sync
npx cap open android    # or ios
```

Verify:

1. Install the build, open once online, sign in (session + data cached).
2. Force-quit the app, enable **airplane mode**.
3. Cold start: home renders, `/plans`, plan detail, `/inbox`, tools all work.
4. Offline mutations (mark read, delete) queue silently.
5. Disable airplane mode: queue flushes, data refreshes, no reload needed.

> Store binaries already submitted keep their old startup behaviour — startup
> cannot be changed remotely. Ship a new build after these changes.
