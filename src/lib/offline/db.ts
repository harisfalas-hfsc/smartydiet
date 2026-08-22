/**
 * Real structured local database (Dexie / IndexedDB).
 *
 * One table per backend table that holds per-user data, storing INDIVIDUAL rows
 * (not blobs), so row counts, sizes and sync watermarks are inspectable in
 * DevTools → Application → IndexedDB and in the /diagnostics panel.
 *
 * This is additive: the legacy key/value snapshots keep powering the existing
 * screens while every row is also mirrored here.
 */
import Dexie, { type Table } from "dexie";

export interface LocalRow {
  id: string;
  user_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface SyncStateRow {
  /** `${userId}::${table}` */
  key: string;
  userId: string;
  table: string;
  /** Server timestamp watermark (ISO) of the newest row pulled so far. */
  cursor: string | null;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export interface OutboxRow {
  id: string;
  userId: string;
  kind: string;
  status: "pending" | "failed";
  retries: number;
  lastError: string | null;
  createdAt: number;
}

export class SmartyDietDB extends Dexie {
  profiles!: Table<LocalRow, string>;
  questionnaires!: Table<LocalRow, string>;
  sessions!: Table<LocalRow, string>;
  plans!: Table<LocalRow, string>;
  notifications!: Table<LocalRow, string>;
  threads!: Table<LocalRow, string>;
  messages!: Table<LocalRow, string>;
  outbox!: Table<OutboxRow, string>;
  sync_state!: Table<SyncStateRow, string>;

  constructor() {
    super("smartydiet");
    this.version(1).stores({
      profiles: "id, updated_at",
      questionnaires: "id, user_id, updated_at, created_at",
      sessions: "id, user_id, updated_at, created_at",
      plans: "id, user_id, session_id, created_at",
      notifications: "id, user_id, created_at",
      threads: "id, user_id, updated_at, last_message_at",
      messages: "id, thread_id, created_at",
      outbox: "id, userId, status, createdAt",
      sync_state: "key, userId, table",
    });
  }
}

let instance: SmartyDietDB | null = null;

/** Returns the local database, or null when IndexedDB is unavailable (SSR). */
export function getDb(): SmartyDietDB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!instance) instance = new SmartyDietDB();
  return instance;
}

export const MIRRORED_TABLES = [
  "profiles",
  "questionnaires",
  "sessions",
  "plans",
  "notifications",
  "threads",
  "messages",
] as const;

export type MirroredTable = (typeof MIRRORED_TABLES)[number];

export async function readSyncState(
  userId: string,
  table: MirroredTable,
): Promise<SyncStateRow | undefined> {
  const db = getDb();
  if (!db) return undefined;
  try {
    return await db.sync_state.get(`${userId}::${table}`);
  } catch {
    return undefined;
  }
}

export async function writeSyncState(
  userId: string,
  table: MirroredTable,
  patch: Partial<Omit<SyncStateRow, "key" | "userId" | "table">>,
) {
  const db = getDb();
  if (!db) return;
  try {
    const key = `${userId}::${table}`;
    const current = (await db.sync_state.get(key)) ?? {
      key,
      userId,
      table,
      cursor: null,
      lastSyncedAt: null,
      lastError: null,
    };
    await db.sync_state.put({ ...current, ...patch });
  } catch {
    /* local diagnostics must never break sync */
  }
}

/** Live row counts + watermarks for the diagnostics panel. */
export async function collectDbStats(userId: string | null) {
  const db = getDb();
  if (!db) return [];
  const out: { table: string; rows: number; lastSyncedAt: number | null; cursor: string | null }[] =
    [];
  for (const name of MIRRORED_TABLES) {
    let rows = 0;
    try {
      rows = await db.table(name).count();
    } catch {
      rows = -1;
    }
    const state = userId ? await readSyncState(userId, name) : undefined;
    out.push({
      table: name,
      rows,
      lastSyncedAt: state?.lastSyncedAt ?? null,
      cursor: state?.cursor ?? null,
    });
  }
  try {
    out.push({
      table: "outbox",
      rows: await db.outbox.count(),
      lastSyncedAt: null,
      cursor: null,
    });
  } catch {
    /* noop */
  }
  return out;
}

/** Mirrors the legacy key/value outbox into a real, inspectable table. */
export async function mirrorOutbox(
  userId: string,
  items: { id: string; kind: string; status: string; retries: number; lastError: string | null; createdAt: number }[],
) {
  const db = getDb();
  if (!db) return;
  try {
    await db.outbox.where("userId").equals(userId).delete();
    if (items.length) {
      await db.outbox.bulkPut(
        items.map((item) => ({
          id: item.id,
          userId,
          kind: item.kind,
          status: item.status === "failed" ? "failed" : "pending",
          retries: item.retries,
          lastError: item.lastError,
          createdAt: item.createdAt,
        })),
      );
    }
  } catch {
    /* noop */
  }
}
