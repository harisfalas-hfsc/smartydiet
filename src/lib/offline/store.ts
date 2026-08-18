import { clear, createStore, del, get, keys, set } from "idb-keyval";
import { isOnlineNow } from "./connectivity";

/**
 * Single IndexedDB store for every offline copy of member data.
 * Every entry is an envelope: { data, savedAt }.
 */
const store =
  typeof indexedDB !== "undefined" ? createStore("smartydiet-offline", "kv") : undefined;

export interface Envelope<T> {
  data: T;
  savedAt: number;
}

/** Logical keys used across the app. Keep them stable — they are persisted. */
export const OFFLINE_KEYS = {
  profile: "profile",
  access: "access",
  freeAccess: "free-access",
  sessions: "sessions",
  questionnaires: "questionnaires",
  notifications: "notifications",
  threads: "threads",
  settings: "settings",
  planVersions: (sessionId: string) => `plan-versions::${sessionId}`,
  session: (sessionId: string) => `session::${sessionId}`,
  library: (name: string) => `library::${name}`,
  media: (url: string) => `media::${url}`,
} as const;

/**
 * Keys that hold member state. These may NEVER be evicted by trimCache —
 * evicting them silently empties someone's plans/inbox while offline.
 */
const PROTECTED_PREFIXES = [
  OFFLINE_KEYS.profile,
  OFFLINE_KEYS.access,
  OFFLINE_KEYS.freeAccess,
  OFFLINE_KEYS.sessions,
  OFFLINE_KEYS.questionnaires,
  OFFLINE_KEYS.notifications,
  OFFLINE_KEYS.threads,
  OFFLINE_KEYS.settings,
  "plan-versions::",
  "session::",
  "library::",
];

const MAX_EXPENDABLE_ENTRIES = 400;

export class OfflineUnavailableError extends Error {
  constructor(message = "You're offline and this device has no saved copy yet.") {
    super(message);
    this.name = "OfflineUnavailableError";
  }
}

export function isOnline(): boolean {
  return isOnlineNow();
}

export function scopedKey(key: string, userId?: string | null): string {
  return `${userId ?? "anon"}::${key}`;
}

function unscopedPart(fullKey: string): string {
  const i = fullKey.indexOf("::");
  return i === -1 ? fullKey : fullKey.slice(i + 2);
}

function isProtected(fullKey: string): boolean {
  const k = unscopedPart(fullKey);
  return PROTECTED_PREFIXES.some((p) => (p.endsWith("::") ? k.startsWith(p) : k === p));
}

export async function saveLocal<T>(key: string, userId: string | null | undefined, data: T) {
  if (!store) return;
  try {
    await set(scopedKey(key, userId), { data, savedAt: Date.now() } satisfies Envelope<T>, store);
  } catch {
    /* quota / private mode — never surface to the user */
  }
}

export async function readLocal<T>(
  key: string,
  userId?: string | null,
): Promise<Envelope<T> | undefined> {
  if (!store) return undefined;
  try {
    return (await get(scopedKey(key, userId), store)) as Envelope<T> | undefined;
  } catch {
    return undefined;
  }
}

export async function removeLocal(key: string, userId?: string | null) {
  if (!store) return;
  try {
    await del(scopedKey(key, userId), store);
  } catch {
    /* noop */
  }
}

/**
 * The one read helper. Try the network, persist the fresh result locally,
 * and on any failure fall back to the last saved copy.
 * Throws only when there is nothing fresh and nothing saved.
 */
export async function offlineFirst<T>(
  key: string,
  loader: () => Promise<T>,
  userId?: string | null,
): Promise<T> {
  if (!isOnline()) {
    const cached = await readLocal<T>(key, userId);
    if (cached) return cached.data;
    throw new OfflineUnavailableError();
  }
  try {
    const fresh = await loader();
    if (fresh !== undefined && fresh !== null) {
      await saveLocal(key, userId, fresh);
      void trimCache();
    }
    return fresh;
  } catch (error) {
    const cached = await readLocal<T>(key, userId);
    if (cached) return cached.data;
    throw error;
  }
}

/** Instant paint helper: returns the saved copy without touching the network. */
export async function readCached<T>(key: string, userId?: string | null): Promise<T | undefined> {
  const env = await readLocal<T>(key, userId);
  return env?.data;
}

/**
 * Evicts ONLY expendable entries (media / non-member detail), oldest first.
 * Member state is protected and never removed here.
 */
export async function trimCache(max = MAX_EXPENDABLE_ENTRIES) {
  if (!store) return;
  try {
    const all = (await keys(store)) as string[];
    const expendable = all.filter((k) => typeof k === "string" && !isProtected(k));
    if (expendable.length <= max) return;
    const withTime = await Promise.all(
      expendable.map(async (k) => {
        const env = (await get(k, store)) as Envelope<unknown> | undefined;
        return { k, savedAt: env?.savedAt ?? 0 };
      }),
    );
    withTime.sort((a, b) => a.savedAt - b.savedAt);
    const toDrop = withTime.slice(0, withTime.length - max);
    await Promise.all(toDrop.map((e) => del(e.k, store)));
  } catch {
    /* noop */
  }
}

/** Clears ONLY the given account's keys (shared devices must stay isolated). */
export async function clearUserCache(userId: string) {
  if (!store) return;
  try {
    const all = (await keys(store)) as string[];
    await Promise.all(
      all.filter((k) => typeof k === "string" && k.startsWith(`${userId}::`)).map((k) => del(k, store)),
    );
  } catch {
    /* noop */
  }
}

export async function clearAllOffline() {
  if (!store) return;
  try {
    await clear(store);
  } catch {
    /* noop */
  }
}

export const offlineStore = store;

/* ------------------------------------------------------------------ */
/* Local database versioning + migrations                              */
/* ------------------------------------------------------------------ */

/** Bump when the SHAPE of stored envelopes changes. Never destroys user data. */
export const LOCAL_DB_VERSION = 2;
const DB_VERSION_KEY = "__meta::db-version";

export async function migrateLocalDatabase(): Promise<number> {
  if (!store) return LOCAL_DB_VERSION;
  try {
    const current = ((await get(DB_VERSION_KEY, store)) as number | undefined) ?? 1;
    if (current === LOCAL_DB_VERSION) return current;
    // v1 -> v2: envelopes gained `savedAt`; backfill instead of deleting.
    if (current < 2) {
      const all = (await keys(store)) as string[];
      await Promise.all(
        all.map(async (k) => {
          if (typeof k !== "string" || k.startsWith("__meta::")) return;
          const env = (await get(k, store)) as Envelope<unknown> | undefined;
          if (env && typeof env === "object" && !("savedAt" in env)) {
            await set(k, { data: env, savedAt: 0 }, store);
          }
        }),
      );
    }
    await set(DB_VERSION_KEY, LOCAL_DB_VERSION, store);
    return LOCAL_DB_VERSION;
  } catch {
    return LOCAL_DB_VERSION;
  }
}

/* ------------------------------------------------------------------ */
/* Sync diagnostics                                                     */
/* ------------------------------------------------------------------ */

export interface SyncMeta {
  lastSuccessAt: number | null;
  lastAttemptAt: number | null;
  lastError: string | null;
  pending: number;
  failed: number;
  dbVersion: number;
}

const SYNC_META_KEY = "sync-meta";

export async function readSyncMeta(userId?: string | null): Promise<SyncMeta> {
  const meta = await readCached<SyncMeta>(SYNC_META_KEY, userId);
  return (
    meta ?? {
      lastSuccessAt: null,
      lastAttemptAt: null,
      lastError: null,
      pending: 0,
      failed: 0,
      dbVersion: LOCAL_DB_VERSION,
    }
  );
}

export async function writeSyncMeta(userId: string | null | undefined, patch: Partial<SyncMeta>) {
  const current = await readSyncMeta(userId);
  await saveLocal(SYNC_META_KEY, userId, { ...current, ...patch });
}

/* ------------------------------------------------------------------ */
/* Media (avatars, hero images) — stored as data URLs so they paint     */
/* instantly offline without a network round trip.                      */
/* ------------------------------------------------------------------ */

const MAX_MEDIA_BYTES = 1_500_000;

export async function cacheMedia(url: string, userId?: string | null): Promise<string | undefined> {
  if (!store || !url || url.startsWith("data:")) return url || undefined;
  const existing = await readCached<string>(OFFLINE_KEYS.media(url), userId);
  if (existing) {
    if (isOnline()) void refreshMedia(url, userId);
    return existing;
  }
  return refreshMedia(url, userId);
}

async function refreshMedia(url: string, userId?: string | null): Promise<string | undefined> {
  if (!isOnline()) return undefined;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    if (blob.size > MAX_MEDIA_BYTES) return undefined;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    await saveLocal(OFFLINE_KEYS.media(url), userId, dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
}

export async function readCachedMedia(url: string, userId?: string | null) {
  if (!url) return undefined;
  return readCached<string>(OFFLINE_KEYS.media(url), userId);
}
