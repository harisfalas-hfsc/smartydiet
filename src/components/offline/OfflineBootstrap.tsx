import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPlanVersions } from "@/lib/plan.functions";
import { listMyThreads, listNotifications } from "@/lib/support.functions";
import { getFreeAccessMode } from "@/lib/free-access.functions";
import { OFFLINE_KEYS, saveLocal, trimCache } from "@/lib/offline/store";
import { flushQueue } from "@/lib/offline/queue";
import { applyUpdate, registerServiceWorker, warmUrls } from "@/lib/offline/register-sw";
import { getOfflineSession, refreshStoredSession } from "@/lib/offline/credentials";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { isOnlineNow, initConnectivity, subscribeConnectivity } from "@/lib/offline/connectivity";

const PUBLIC_PAGES = [
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

const MEMBER_PAGES = ["/plans", "/questionnaire", "/inbox"];

/**
 * Downloads the member's entire world in the background right after sign-in
 * (and again whenever connectivity returns), so every page works offline
 * without ever being visited first. Completely silent.
 */
export function OfflineBootstrap() {
  const [updateReady, setUpdateReady] = useState(false);
  const running = useRef(false);

  const prefetch = useCallback(async () => {
    if (running.current) return;
    if (!isOnlineNow()) return;
    running.current = true;
    try {
      warmUrls([...PUBLIC_PAGES, ...MEMBER_PAGES]);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user ?? null;

      // Public/global state is cached for everyone, signed in or not.
      await Promise.allSettled([
        getFreeAccessMode().then((v) => saveLocal(OFFLINE_KEYS.freeAccess, user?.id ?? null, v)),
      ]);

      if (!user) return;
      const uid = user.id;

      await Promise.allSettled([
        // profile + settings
        supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              void saveLocal(OFFLINE_KEYS.profile, uid, data);
              void saveLocal(OFFLINE_KEYS.settings, uid, {
                marketing_opt_in: (data as { marketing_opt_in?: boolean }).marketing_opt_in ?? false,
              });
            }
          }),

        // access / entitlements
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .then(({ data }) => saveLocal(OFFLINE_KEYS.access, uid, data ?? [])),

        // questionnaires
        supabase
          .from("questionnaires")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data }) => saveLocal(OFFLINE_KEYS.questionnaires, uid, data ?? [])),

        // inbox
        listNotifications({})
          .then((res) => saveLocal(OFFLINE_KEYS.notifications, uid, res.notifications))
          .catch(() => undefined),
        listMyThreads({})
          .then((res) => saveLocal(OFFLINE_KEYS.threads, uid, res.threads))
          .catch(() => undefined),

        // every owned session + every plan version of each session
        supabase
          .from("generation_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .then(async ({ data }) => {
            const rows = data ?? [];
            await saveLocal(OFFLINE_KEYS.sessions, uid, rows);
            await Promise.allSettled(
              rows.map(async (row: { id: string }) => {
                await saveLocal(OFFLINE_KEYS.session(row.id), uid, row);
                try {
                  const versions = await listPlanVersions({ data: { sessionId: row.id } });
                  await saveLocal(OFFLINE_KEYS.planVersions(row.id), uid, versions);
                } catch {
                  /* keep whatever is already saved */
                }
              }),
            );
          }),
      ]);

      // Keep the offline sign-in snapshot fresh.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session && user.email) {
        void refreshStoredSession(user.email, sessionData.session, {
          id: uid,
          email: user.email,
          displayName:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            null,
        });
      }

      await flushQueue(uid);
      await trimCache();
    } catch {
      /* silent by design */
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    registerServiceWorker(() => setUpdateReady(true));

    void prefetch();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void prefetch();
      }
    });

    const onOnline = () => {
      void prefetch();
      const offlineSession = getOfflineSession();
      if (offlineSession) void flushQueue(offlineSession.user.id);
    };
    window.addEventListener("online", onOnline);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, [prefetch]);

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] mx-auto flex w-[min(92vw,420px)] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg">
      <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm font-medium">A new version is available.</p>
      <Button size="sm" onClick={applyUpdate}>
        Refresh
      </Button>
    </div>
  );
}
