import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getOfflineSession } from "@/lib/offline/credentials";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Offline: accept the cached session so members are never kicked out.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const cached = getOfflineSession();
      if (cached) return { user: cached.user };
      throw redirect({ to: "/auth" });
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const cached = getOfflineSession();
      if (cached) return { user: cached.user };
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
