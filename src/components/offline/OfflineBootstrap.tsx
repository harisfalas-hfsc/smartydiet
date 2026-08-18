import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { flushQueue } from "@/lib/offline/queue";
import { runBackgroundSync } from "@/lib/offline/sync";
import { applyUpdate, registerServiceWorker } from "@/lib/offline/register-sw";
import { getOfflineSession } from "@/lib/offline/credentials";
import { migrateLocalDatabase } from "@/lib/offline/store";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { initConnectivity, subscribeConnectivity } from "@/lib/offline/connectivity";

/**
 * Boot sequence owner: connectivity first, then local DB migration, then the
 * service worker, then a silent background sync. Renders nothing except the
 * (non-blocking) "new version available" prompt.
 */
export function OfflineBootstrap() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Connectivity MUST be resolved before the first data read, otherwise a
    // native cold start in airplane mode races the network layer and fails.
    void initConnectivity()
      .then(() => migrateLocalDatabase())
      .then(() => {
        registerServiceWorker(() => setUpdateReady(true));
        void runBackgroundSync();
        unsubscribe = subscribeConnectivity((online) => {
          if (!online) return;
          void runBackgroundSync();
          const offlineSession = getOfflineSession();
          if (offlineSession) void flushQueue(offlineSession.user.id);
        });
      });

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
      unsubscribe?.();
    };
  }, []);

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
