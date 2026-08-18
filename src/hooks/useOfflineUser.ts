import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOfflineSession } from "@/lib/offline/credentials";

/** Current user id, resolved from the live session or the cached offline one. */
export function useOfflineUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(() => getOfflineSession()?.user.id ?? null);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUserId(data.session?.user.id ?? getOfflineSession()?.user.id ?? null);
      })
      .catch(() => {
        if (active) setUserId(getOfflineSession()?.user.id ?? null);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setUserId(s?.user.id ?? getOfflineSession()?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
