# Offline mode: real local database + verifiable sync

## What I found

**Service worker** — It is real and correctly built/served (`/sw.js` returns 200 on the live domain, precache manifest present, marketing pages precached, assets cached). So the app shell part is largely fine. Two weaknesses: registration only happens *after* a connectivity probe and a local-DB migration both resolve, so if either hangs on a cold start nothing registers and nothing syncs; and there is no visible proof that the worker actually controls the page.

**Local data** — This is the real problem. Everything is stored as a handful of big blobs in a single key/value bucket (`idb-keyval`), not as tables:
- one blob for all plans, one per plan version, one for questionnaires, one for the inbox
- no per-record rows, no `updated_at` tracking, no per-table sync timestamps
- the whole sync is all-or-nothing: it re-downloads everything each pass, and a single failure mid-way leaves partial data with no way to tell what is missing
- the outbox exists but is one array under one key, with no visibility

**Why storage looks like a few kilobytes** — Two separate causes. (1) On Android, the app-info entry for an installed PWA reports the WebAPK shell only; the actual cache/IndexedDB live under Chrome's own storage, so that screen will never show your data even when it is there. (2) The sync genuinely can no-op: it is gated behind the connectivity probe and only runs on boot/foreground, so a device that boots slow or fails one probe stores nothing and gives no signal.

**Per-user tables in the backend** (from the real schema): `profiles`, `questionnaires`, `generation_sessions`, `diet_plans` (the heavy one — full plan JSON per version), `notifications`, `support_threads`, `support_messages`, `user_roles`.
Note: `diet_plans`, `notifications` and `support_messages` are append-only and have no `updated_at` — I will delta-sync those by `created_at`/`id`, which is correct for immutable rows. Everything else uses server `updated_at`. No data type here needs merge logic beyond last-write-wins.

## Plan

**1. Real local database (Dexie)**
Add Dexie with one table per backend table above, keyed by real row `id` and indexed by `user_id` + `updated_at`/`created_at`. Rows are stored individually, so you will see actual row counts, not blobs. Existing key/value data is migrated over on first boot, never wiped.

**2. Delta sync**
Per table, store `last_synced_at` locally per device. Each pass pulls only rows newer than that watermark and upserts them, then advances the watermark. Runs on login, on app foreground, on regaining connectivity, and on a background interval while online. Plan JSON (the big payload) is pulled for every session, not just recent ones, so a full plan library lands on the device.

**3. Outbox**
Offline writes go into a proper Dexie `outbox` table with status, retries and last error; flushed on reconnect and cleared only on a confirmed server write. Conflicts resolve last-write-wins by `updated_at`.

**4. Read path**
Screens that show user data read Dexie first (instant, works offline) and reconcile with a live fetch when online. I touch only the fetch layer of those screens — no UI, layout, styling, payments or auth-flow changes.

**5. Service worker hardening**
Register the worker immediately on boot instead of behind the connectivity chain, and record whether `navigator.serviceWorker.controller` is non-null so it is provable.

**6. Session**
Verify the client persists the refresh token in storage that survives restart (and is not overridden), so reopening offline lands on cached data instead of a login wall.

**7. Debug panel you can actually read**
Extend the existing hidden `/diagnostics` page (opened with `?qa=1`, plus a 5-tap-on-logo gesture) to show: service worker registered / active / controlling, cache names + entry counts, every Dexie table with live row counts, `last_synced_at` per table, outbox length, and estimated bytes used via `navigator.storage.estimate()`.

## What you should expect to see afterwards

In DevTools → Application:
- **Cache Storage**: `workbox-precache-*` with ~100 entries plus `smartydiet-pages` / `smartydiet-assets` — a few MB total.
- **IndexedDB**: a `smartydiet` database with named tables (`profiles`, `questionnaires`, `sessions`, `plans`, `notifications`, `threads`, `messages`, `outbox`, `sync_state`) and non-zero row counts — `plans` should match your number of generated plan versions and is the largest, typically tens to hundreds of KB each.
- **Storage estimate** (shown on the debug panel too): single-digit MB, not kilobytes.
- Android app-info will still under-report for the installed PWA — use the debug panel or Chrome DevTools instead.
