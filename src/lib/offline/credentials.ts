/**
 * Offline sign-in support.
 *
 * On a successful ONLINE login we store, per device:
 *   - a PBKDF2-SHA256 verifier of the password (random salt, 310k iterations)
 *   - the last known session + user snapshot
 * The raw password is never stored.
 *
 * With no internet, the typed password is verified against the stored verifier
 * and the cached session is restored in read-only mode.
 */
import { del, get, keys, set, createStore } from "idb-keyval";

const store =
  typeof indexedDB !== "undefined" ? createStore("smartydiet-offline", "kv") : undefined;

const ITERATIONS = 310_000;
const CRED_PREFIX = "device::credential::";
export const OFFLINE_SESSION_KEY = "smartydiet.offline.session";

export interface CachedUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

interface StoredCredential {
  email: string;
  salt: string;
  iterations: number;
  hash: string;
  user: CachedUser;
  session: unknown;
  savedAt: number;
}

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return b64(bits);
}

function credKey(email: string) {
  return `${CRED_PREFIX}${email.trim().toLowerCase()}`;
}

export async function rememberDeviceCredential(opts: {
  email: string;
  password: string;
  user: CachedUser;
  session: unknown;
}) {
  if (!store || typeof crypto?.subtle === "undefined") return;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(opts.password, salt, ITERATIONS);
    const record: StoredCredential = {
      email: opts.email.trim().toLowerCase(),
      salt: b64(salt.buffer as ArrayBuffer),
      iterations: ITERATIONS,
      hash,
      user: opts.user,
      session: opts.session,
      savedAt: Date.now(),
    };
    await set(credKey(opts.email), record, store);
  } catch {
    /* noop */
  }
}

/** Refreshes the stored session snapshot without touching the verifier. */
export async function refreshStoredSession(email: string, session: unknown, user: CachedUser) {
  if (!store) return;
  try {
    const existing = (await get(credKey(email), store)) as StoredCredential | undefined;
    if (!existing) return;
    await set(credKey(email), { ...existing, session, user, savedAt: Date.now() }, store);
  } catch {
    /* noop */
  }
}

export async function verifyDeviceCredential(
  email: string,
  password: string,
): Promise<{ user: CachedUser; session: unknown } | null> {
  if (!store || typeof crypto?.subtle === "undefined") return null;
  try {
    const record = (await get(credKey(email), store)) as StoredCredential | undefined;
    if (!record) return null;
    const hash = await derive(password, fromB64(record.salt), record.iterations);
    if (hash !== record.hash) return null;
    return { user: record.user, session: record.session };
  } catch {
    return null;
  }
}

export async function hasDeviceCredential(email?: string): Promise<boolean> {
  if (!store) return false;
  try {
    if (email) return Boolean(await get(credKey(email), store));
    const all = (await keys(store)) as string[];
    return all.some((k) => typeof k === "string" && k.startsWith(CRED_PREFIX));
  } catch {
    return false;
  }
}

export async function forgetDeviceCredentials(email?: string) {
  if (!store) return;
  try {
    if (email) {
      await del(credKey(email), store);
      return;
    }
    const all = (await keys(store)) as string[];
    await Promise.all(
      all.filter((k) => typeof k === "string" && k.startsWith(CRED_PREFIX)).map((k) => del(k, store)),
    );
  } catch {
    /* noop */
  }
}

/* ---------- offline session (read-only) ---------- */

export interface OfflineSession {
  user: CachedUser;
  readOnly: true;
  startedAt: number;
}

export function setOfflineSession(user: CachedUser) {
  try {
    localStorage.setItem(
      OFFLINE_SESSION_KEY,
      JSON.stringify({ user, readOnly: true, startedAt: Date.now() } satisfies OfflineSession),
    );
  } catch {
    /* noop */
  }
}

export function getOfflineSession(): OfflineSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineSession;
    return parsed?.user?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOfflineSession() {
  try {
    localStorage.removeItem(OFFLINE_SESSION_KEY);
  } catch {
    /* noop */
  }
}
