/**
 * Delta mirror: pulls every per-user backend row into the local Dexie tables.
 *
 * Each table keeps its own watermark (the newest server timestamp seen), so a
 * pass only downloads what changed since the last one and an interrupted pass
 * resumes instead of restarting. Conflicts are last-write-wins by the server
 * timestamp, which is what an upsert of the server row already gives us.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  MIRRORED_TABLES,
  type LocalRow,
  type MirroredTable,
  getDb,
  readSyncState,
  writeSyncState,
} from "./db";
import { isOnlineNow } from "./connectivity";

const PAGE = 500;

interface TableSpec {
  local: MirroredTable;
  remote: string;
  /** Server column used as the delta cursor. */
  cursor: "updated_at" | "created_at";
  /** Restrict to the signed-in user (tables without user_id rely on RLS). */
  scopeToUser?: "user_id" | "id";
}

const SPECS: TableSpec[] = [
  { local: "profiles", remote: "profiles", cursor: "updated_at", scopeToUser: "id" },
  {
    local: "questionnaires",
    remote: "questionnaires",
    cursor: "updated_at",
    scopeToUser: "user_id",
  },
  {
    local: "sessions",
    remote: "generation_sessions",
    cursor: "updated_at",
    scopeToUser: "user_id",
  },
  { local: "plans", remote: "diet_plans", cursor: "created_at", scopeToUser: "user_id" },
  { local: "notifications", remote: "notifications", cursor: "created_at", scopeToUser: "user_id" },
  { local: "threads", remote: "support_threads", cursor: "updated_at", scopeToUser: "user_id" },
  { local: "messages", remote: "support_messages", cursor: "created_at" },
];

async function pullTable(userId: string, spec: TableSpec, full: boolean): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const state = await readSyncState(userId, spec.local);
  let cursor = full ? null : (state?.cursor ?? null);
  let pulled = 0;

  try {
    for (;;) {
      if (!isOnlineNow()) break;
      let query = supabase
        .from(spec.remote as never)
        .select("*")
        .order(spec.cursor, { ascending: true })
        .limit(PAGE);
      if (spec.scopeToUser) query = query.eq(spec.scopeToUser, userId);
      if (cursor) query = query.gt(spec.cursor, cursor);

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as LocalRow[];
      if (!rows.length) break;

      await db.table(spec.local).bulkPut(rows);
      pulled += rows.length;

      const last = rows[rows.length - 1];
      const next = (last?.[spec.cursor] as string | null | undefined) ?? null;
      // Guard against a stuck cursor when many rows share one timestamp.
      if (!next || next === cursor) break;
      cursor = next;

      await writeSyncState(userId, spec.local, {
        cursor,
        lastSyncedAt: Date.now(),
        lastError: null,
      });
      if (rows.length < PAGE) break;
    }

    await writeSyncState(userId, spec.local, {
      cursor,
      lastSyncedAt: Date.now(),
      lastError: null,
    });
  } catch (error) {
    await writeSyncState(userId, spec.local, {
      lastError: error instanceof Error ? error.message : "Pull failed",
    });
  }
  return pulled;
}

/**
 * Runs one delta pass over every mirrored table. Never throws.
 * `full = true` ignores the watermarks and re-pulls everything.
 */
export async function mirrorUserData(userId: string, full = false): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  let total = 0;
  for (const spec of SPECS) {
    total += await pullTable(userId, spec, full);
  }
  return total;
}

/** Removes another account's rows so shared devices stay isolated. */
export async function clearMirror(): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await Promise.all(MIRRORED_TABLES.map((name) => db.table(name).clear()));
    await db.sync_state.clear();
  } catch {
    /* noop */
  }
}
