import { Link } from "@tanstack/react-router";
import type { ReactNode, CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Single source of truth for "start a diet plan" navigation.
 * Signed in  -> straight into the questionnaire.
 * Signed out -> create an account / sign in first, then return to the
 *               questionnaire so nobody loses their progress.
 */
export function useStartPlanTarget() {
  const { user, loading } = useAuth();
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
