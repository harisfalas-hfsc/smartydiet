import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { findResumablePayment } from "@/lib/payment-recovery.client";

/** Automatically continues an unfinished authorized purchase on any app visit. */
export function PaymentRecovery() {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    // Checkout owns its own redirect lifecycle. Global recovery must never
    // navigate while Stripe is open or while the return page is processing.
    if (loading || !user?.id || pathname.startsWith("/checkout")) return;

    let active = true;
    void findResumablePayment(user.id)
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
  }, [loading, navigate, pathname, user?.id]);

  return null;
}
