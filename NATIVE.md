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

## Purchases (App Store / Play Store readiness)

Digital goods sold inside a native app MUST go through Apple In-App Purchase
and Google Play Billing. Stripe checkout is web-only, and linking out to the
website from inside the app is grounds for rejection.

`src/lib/purchases/index.ts` is the single decision point:

| Platform | Channel | Behaviour today |
| --- | --- | --- |
| web / PWA | `stripe` | Stripe embedded checkout (live) |
| iOS / Android with a purchase plugin | `native-iap` | store billing (to be wired) |
| iOS / Android without the plugin | `unavailable` | neutral notice, no outbound link |

Before submission:

1. Register the product in App Store Connect and Play Console using
   `STORE_PRODUCT_IDS.dietPlan` (`com.smartydiet.plan.onetime`), priced to match €9.99.
2. Install a purchase plugin (e.g. `@revenuecat/purchases-capacitor`) and
   implement `native-iap` inside `src/lib/purchases` only — no other file changes.
3. Grant credits server-side after receipt validation, reusing the same
   `generation_sessions` row shape the Stripe webhook writes.
4. Alternatively, flip Admin → Payments → Global Free Access Mode ON for a
   review build so no purchase path is visible at all.

## Abandoned-checkout recovery cron

`POST /api/public/recover-abandoned` with header
`Authorization: Bearer $CRON_SECRET`. Sends one reminder per member per
questionnaire per stage (questionnaire started, or completed but not paid),
between 2 hours and 7 days after the last activity. Run it once or twice a day.
