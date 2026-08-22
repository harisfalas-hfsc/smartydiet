import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { flushQueue } from "@/lib/offline/queue";
import { runBackgroundSync } from "@/lib/offline/sync";
import { registerServiceWorker } from "@/lib/offline/register-sw";
import { getOfflineSession } from "@/lib/offline/credentials";
import { migrateLocalDatabase } from "@/lib/offline/store";
import { initConnectivity, subscribeConnectivity } from "@/lib/offline/connectivity";

/**
 * Boot sequence owner: connectivity first, then local DB migration, then the
 * service worker, then a silent background sync. Renders nothing — updates and
 * caching are fully automatic and never prompt the user.
 */
export function OfflineBootstrap() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // The worker registers immediately and independently: it must never be
    // blocked by a slow connectivity probe or a local DB migration.
    void registerServiceWorker();

    // Connectivity MUST be resolved before the first data read, otherwise a
    // native cold start in airplane mode races the network layer and fails.
    void initConnectivity()
      .then(() => migrateLocalDatabase())
      .then(async () => {
        void runBackgroundSync();
        unsubscribe = subscribeConnectivity((online) => {
          if (!online) return;
          void runBackgroundSync();
          const offlineSession = getOfflineSession();
          if (offlineSession) void flushQueue(offlineSession.user.id);
        });
      });

    // Periodic top-up while the app stays open (multi-device convergence).
    const interval = window.setInterval(() => void runBackgroundSync(), 5 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void runBackgroundSync();
    };
    document.addEventListener("visibilitychange", onVisible);


    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void runBackgroundSync();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
      unsubscribe?.();
    };
  }, []);

  return null;
}
