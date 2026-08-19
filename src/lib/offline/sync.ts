/**
 * SyncManager — the single background synchronisation entry point.
 *
 * Runs in priority phases so the user is never blocked:
 *   P1 identity  : profile, avatar media, entitlements, app settings
 *   P2 user data : questionnaires, sessions, plan versions, inbox
 *   P3 shell     : route pre-warm for offline navigation
 *
 * Every phase is checkpointed, so an interrupted sync resumes instead of
 * restarting from zero. Never throws, never blocks the UI.
 */
import { supabase } from "@/integrations/supabase/client";
import { listPlanVersions } from "@/lib/plan.functions";
import { listMyThreads, listNotifications } from "@/lib/support.functions";
import { getFreeAccessMode } from "@/lib/free-access.functions";
import {
  OFFLINE_KEYS,
  cacheMedia,
  migrateLocalDatabase,
  readCached,
  saveLocal,
  trimCache,
  writeSyncMeta,
} from "./store";
import { flushQueue } from "./queue";
import { warmUrls } from "./register-sw";
import { refreshStoredSession } from "./credentials";
import { isOnlineNow, reportRequestFailure, reportRequestSuccess } from "./connectivity";

export const PUBLIC_PAGES = [
  "/",
  "/about",
  "/how-it-works",
  "/pricing",
  "/faq",
  "/contact",
  "/tools",
  "/tools/bmr-calculator",
  "/tools/calorie-counter",
  "/tools/macro-calculator",
  "/diet-science",
  "/nutrition-intelligence",
  "/glossary",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/auth",
];

export const MEMBER_PAGES = ["/plans", "/questionnaire", "/inbox"];

type SyncListener = (busy: boolean) => void;
const listeners = new Set<SyncListener>();
let busy = false;

export function subscribeSyncing(fn: SyncListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setBusy(next: boolean) {
  if (busy === next) return;
  busy = next;
  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* noop */
    }
  });
}

const CHECKPOINT = "sync-checkpoint";

interface Checkpoint {
  doneSessionIds: string[];
  updatedAt: number;
}

/**
 * Runs the full background sync. Safe to call from anywhere and any number of
 * times — concurrent calls collapse into the running one.
 */
export async function runBackgroundSync(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (busy) return;
  if (!isOnlineNow() && !force) return;

  setBusy(true);
  let uid: string | null = null;
  try {
    await migrateLocalDatabase();
    await writeSyncMeta(null, { lastAttemptAt: Date.now() });

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    uid = user?.id ?? null;
    await writeSyncMeta(uid, { lastAttemptAt: Date.now(), lastError: null });

    /* -------- P1: public config + identity -------- */
    await Promise.allSettled([
      getFreeAccessMode().then((v) => saveLocal(OFFLINE_KEYS.freeAccess, uid, v)),
    ]);

    if (!user || !uid) {
      await warmUrls(PUBLIC_PAGES);
      await writeSyncMeta(null, { lastSuccessAt: Date.now() });
      return;
    }
    const userId = uid;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (profile) {
      await saveLocal(OFFLINE_KEYS.profile, userId, profile);
      await saveLocal(OFFLINE_KEYS.settings, userId, {
        marketing_opt_in: (profile as { marketing_opt_in?: boolean }).marketing_opt_in ?? false,
      });
      const avatar = (profile as { avatar_url?: string | null }).avatar_url;
      const cachedAvatar = avatar ? await cacheMedia(avatar, userId) : undefined;
      await setOfflineSession({
        id: userId,
        email: user.email ?? null,
        displayName:
          (profile as { display_name?: string | null }).display_name ??
          (user.user_metadata?.full_name as string | undefined) ??
          null,
        avatarUrl: cachedAvatar ?? avatar ?? null,
      });
    }

    await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => saveLocal(OFFLINE_KEYS.access, userId, data ?? []));

    /* -------- P2: the member's own data -------- */
    await Promise.allSettled([
      supabase
        .from("questionnaires")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => saveLocal(OFFLINE_KEYS.questionnaires, userId, data ?? [])),
      listNotifications({})
        .then((res) => saveLocal(OFFLINE_KEYS.notifications, userId, res.notifications))
        .catch(() => undefined),
      listMyThreads({})
        .then((res) => saveLocal(OFFLINE_KEYS.threads, userId, res.threads))
        .catch(() => undefined),
    ]);

    const { data: sessionRows } = await supabase
      .from("generation_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = sessionRows ?? [];
    await saveLocal(OFFLINE_KEYS.sessions, userId, rows);

    const checkpoint = (await readCached<Checkpoint>(CHECKPOINT, userId)) ?? {
      doneSessionIds: [],
      updatedAt: 0,
    };
    // A fresh pass every 6 hours; otherwise resume where the last one stopped.
    const resume = force || Date.now() - checkpoint.updatedAt > 6 * 60 * 60 * 1000 ? [] : checkpoint.doneSessionIds;
    const done = new Set(resume);

    for (const row of rows as { id: string }[]) {
      if (!isOnlineNow()) break;
      await saveLocal(OFFLINE_KEYS.session(row.id), userId, row);
      if (done.has(row.id)) continue;
      try {
        const versions = await listPlanVersions({ data: { sessionId: row.id } });
        await saveLocal(OFFLINE_KEYS.planVersions(row.id), userId, versions);
        done.add(row.id);
        await saveLocal(CHECKPOINT, userId, {
          doneSessionIds: [...done],
          updatedAt: Date.now(),
        } satisfies Checkpoint);
      } catch {
        /* keep whatever is already saved; next pass retries this session */
      }
    }

    /* -------- keep the offline sign-in snapshot fresh -------- */
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session && user.email) {
      void refreshStoredSession(user.email, sessionData.session, {
        id: userId,
        email: user.email,
        displayName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
      });
    }

    /* -------- P3: shell + queue + housekeeping -------- */
    await warmUrls([...PUBLIC_PAGES, ...MEMBER_PAGES]);
    await flushQueue(userId);
    await trimCache();

    reportRequestSuccess();
    await writeSyncMeta(userId, { lastSuccessAt: Date.now(), lastError: null });
  } catch (error) {
    reportRequestFailure();
    await writeSyncMeta(uid, {
      lastError: error instanceof Error ? error.message : "Sync failed",
    });
  } finally {
    setBusy(false);
  }
}
