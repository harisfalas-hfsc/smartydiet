# SmartyDiet — one codebase, every platform

Desktop web, laptop web, tablet web, mobile web, installed PWA and the future
native iOS/Android apps all run the **same** application code, the same data
model, the same local-first store, the same mutation queue and the same sync
engine. The native app is a thin wrapper, not a second implementation.

## Architecture

```
app shell (service worker cache)
  + local persistent data (IndexedDB, src/lib/offline/store.ts)
  + local-first reads (offlineFirst / readCached)
  + durable mutation queue (src/lib/offline/queue.ts)
  + background sync (src/lib/offline/sync.ts)
  + server as authority when online
  + thin platform layer (src/lib/platform/index.ts)
```

Nothing branches on "web vs native" outside `src/lib/platform`.

## What the platform layer does

| Concern | Web / PWA | Native WebView |
| --- | --- | --- |
| App assets | served + service-worker cached | bundled on device |
| Server functions | relative `/_serverFn/...` | rewritten onto `VITE_API_ORIGIN` (default `https://smartydiet.com`) via `serverFns.fetch` in `src/start.ts` |
| Health probe | `/api/public/health` | same path on the API origin |
| Network state | `navigator.onLine` + probe | `@capacitor/network` + probe |
| Storage | IndexedDB | IndexedDB (same code) |

## Building the native apps

```bash
npm run build                 # produces dist/client (the app shell)
npx cap add ios               # first time only
npx cap add android           # first time only
npx cap sync
npx cap open ios              # / npx cap open android
```

Set a different backend when needed:

```bash
VITE_API_ORIGIN=https://smartydiet.com npm run build && npx cap sync
```

## Native bridge capabilities (optional, additive)

Push notifications, camera, biometrics, native share and deep links are **not**
required by the app. When added, they must be exposed as small capabilities
checked with `hasNativeBridge(...)` and must never fork the app logic.

## QA

`/diagnostics` (dev build, or `?qa=1` in production) reports service-worker
state, cached shell entries, IndexedDB contents, local identity/avatar, pending
and failed operations, and last sync result. It is not linked in the product UI.
