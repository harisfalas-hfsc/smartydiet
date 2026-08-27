import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { getResumableDietSession } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";

/** Automatically continues an unfinished authorized purchase on any app visit. */
export function PaymentRecovery() {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const getResumable = useServerFn(getResumableDietSession);

  useEffect(() => {
    if (loading || !user?.id || pathname === "/checkout/return") return;

    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        // Without a live access token the server fn would 401 and blank the page.
        if (!active || !data.session?.access_token) return null;
        return getResumable({});
      })
      .then((result) => {
        if (!active || !result?.stripeSessionId) return;
        
        navigate({
          to: "/checkout/return",
          search: { session_id: result.stripeSessionId },
          replace: true,
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [getResumable, loading, navigate, pathname, user?.id]);

  return null;
}
