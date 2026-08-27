import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getOfflineSession } from "@/lib/offline/credentials";
import { isOnlineNow } from "@/lib/offline/connectivity";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Offline: accept the cached session so members are never kicked out.
    if (typeof window !== "undefined" && !isOnlineNow()) {
      const cached = getOfflineSession();
      if (cached) return { user: cached.user };
      throw redirect({ to: "/auth" });
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
