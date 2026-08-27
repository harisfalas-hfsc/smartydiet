# Remove offline mode, always-fresh app, charge-first payments, guaranteed diet delivery

## 1. Offline mode: fully removed

Delete the entire offline layer and every consumer of it:

- Delete `src/lib/offline/*` (connectivity, credentials, db, mirror, queue, store, sync, debug-gesture), `src/components/offline/*` (OfflineBootstrap, OfflineNotice, SyncStatus), `src/hooks/useOfflineUser.ts`, `src/hooks/useOnlineStatus.ts`, `src/routes/diagnostics.tsx`, `docs/NATIVE_OFFLINE_UNIVERSAL_PROMPT.md`.
- Rewrite every screen that read through the offline cache (`plans`, `plans.$sessionId`, `inbox` panels, `questionnaire`, `settings`, `_authenticated/route.tsx`, `auth.tsx`, `useAuth`, `Navigation`, `__root`) to read directly from the backend — plain queries, no cached fallback, no offline identity, no queued writes.
- Sign-out clears everything: local/session storage keys, IndexedDB databases, and all caches. No stale account data can survive a sign-out or an account switch.
- Remove offline-related dependencies (Dexie/idb-keyval, Capacitor network usage in this layer) from `package.json`.

## 2. Always-fresh: publish once, everyone sees it immediately

Keep a normal installable PWA (icons, manifest, home-screen install) but stop it caching the app:

- Service worker becomes a minimal, network-only worker: it never serves stale HTML/JS, takes control immediately (`skipWaiting` + `clients.claim`), and self-updates on every load.
- Add a startup version check: the app fetches its build id, and if the running build differs from the published one it reloads once, silently. No "update available" prompt, no reload loops (single guarded reload per version).
- HTML and the version endpoint are served no-store so desktop, laptop, tablet, mobile browser and installed PWA all pick up a publish on the next open.
- A one-time cleanup on boot unregisters the old worker and deletes all old caches, so devices stuck on the previous cached build recover by themselves.

## 3. Payment: charge first, no card authorization

- Checkout switches from manual authorization to an immediate charge (`capture_method: automatic`). Declines simply fail at Stripe checkout and no session, no plan, no record of an "authorized" state is created.
- Plan generation starts only after Stripe confirms the payment succeeded (webhook `checkout.session.completed` / `payment_intent.succeeded`).
- All authorize/capture/release code paths are removed: `captureDietPayment`, release-on-failure logic, `requires_capture` branches, `authorization_released` / `capture_failed` statuses. Statuses reduce to: `pending` → `paid` → `generating` → `completed` / `generation_failed`.
- Bank-statement branding: keep `SMARTYDIET` as statement descriptor suffix. The account-level prefix belongs to the shared payment account and can only be changed in the payment account settings — I will report exactly what needs changing there; code cannot override the prefix.

## 4. Paid but no plan: we owe the customer a diet

- Every paid session permanently keeps its questionnaire snapshot. The customer never re-fills anything.
- If generation fails, the session is marked `generation_failed` with the reason and an attempt counter, and the questionnaire stays linked.
- Automatic background retries: a scheduled job re-runs generation for every paid-but-undelivered session, up to 4 attempts with increasing delays (about 1 min, 5 min, 20 min, 60 min). Each retry is idempotent — it can never produce a duplicate plan or a duplicate charge.
- My Plans shows such a session as "We owe you this diet — we're retrying" with a manual "Try again now" button, and the diet appears there as soon as any retry succeeds.

## 5. Immediate failure alerts to smartydiet@outlook.com

- An email is sent immediately on the first failure of a paid session, with customer email, session id, questionnaire id, stage, attempt number, and the exact reason (AI credit exhaustion, AI error, timeout, database error, etc.).
- A second email is sent if all retries are exhausted ("diet still undelivered — manual action required"), and a resolution email when a retry finally succeeds.
- The admin panel's generation-failures tab lists these paid-undelivered sessions with attempt counts and a manual retry action.

## Technical notes

- Checkout: `src/lib/payments.functions.ts` — drop manual capture, drop release/capture server fns; webhook `src/routes/api/public/payments/webhook.ts` becomes the single trigger for generation.
- Generation: `src/lib/plan-generation.server.ts` — strip all Stripe capture logic; generation only verifies the session is `paid`.
- Retries: new columns on `generation_sessions` (`attempt_count`, `last_error`, `next_retry_at`, `delivered`) via migration, plus a new `src/routes/api/public/retry-generation.ts` cron endpoint secured like the existing `recover-abandoned` route, scheduled every minute.
- Alerts reuse `src/lib/plan-generation-alert.server.ts` (already targets smartydiet@outlook.com).
- PWA: rework the `VitePWA` config to a network-only/no-precache worker plus a build-id endpoint; remove `src/lib/offline/register-sw.ts` in favour of a small registration module.

## Verification after implementation

Build + typecheck, a browser pass over sign-in/sign-out (no stale data), a test-mode purchase (declined card → no plan; successful card → plan delivered), a forced generation failure to confirm the alert email and the automatic retry, and a check that a published change appears on a fresh load without manual cache clearing.
