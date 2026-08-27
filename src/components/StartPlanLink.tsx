import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { getResumableDietSession } from "@/lib/payments.functions";

/**
 * Single source of truth for "start a diet plan" navigation.
 * Signed in  -> straight into the questionnaire.
 * Signed out -> create an account / sign in first, then return to the
 *               questionnaire so nobody loses their progress.
 */
export function useStartPlanTarget() {
  const { user, loading } = useAuth();
  const getResumable = useServerFn(getResumableDietSession);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user?.id) {
      setStripeSessionId(null);
      return;
    }
    let active = true;
    void getResumable({}).then((result) => {
      if (active) setStripeSessionId(result.stripeSessionId);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [getResumable, loading, user?.id]);

  if (stripeSessionId) {
    return {
      to: "/checkout/return" as const,
      search: { session_id: stripeSessionId },
    };
  }
  if (loading || user) {
    return { to: "/questionnaire" as const, search: undefined };
  }
  return {
    to: "/auth" as const,
    search: { mode: "signup" as const, next: "/questionnaire" },
  };
}

export function StartPlanLink({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const target = useStartPlanTarget();
  return (
    <Link
      to={target.to}
      search={target.search as never}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
