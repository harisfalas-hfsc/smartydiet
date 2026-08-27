import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { findResumablePayment } from "@/lib/payment-recovery.browser";
import { toast } from "sonner";

/** Offers recovery without forcing navigation or creating redirect loops. */
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

        toast.info("Your saved diet is ready to continue.", {
          id: `payment-recovery-${result.stripeSessionId}`,
          duration: Infinity,
          description: "Continue from your saved questionnaire and card authorization.",
          action: {
            label: "Continue",
            onClick: () =>
              navigate({
                to: "/checkout/return",
                search: { session_id: result.stripeSessionId ?? undefined },
              }),
          },
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [loading, navigate, pathname, user?.id]);

  return null;
}
