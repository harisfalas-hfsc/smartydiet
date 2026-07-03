import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/smartydiet-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartyDiet — Your personalized nutrition plan in minutes" },
      {
        name: "description",
        content:
          "Answer a smart questionnaire, get a fully personalized diet plan built around your body, goals, food preferences and constraints. Just $4.99, one time.",
      },
    ],
  }),
  component: Home,
});

const INCLUDES = [
  "Calorie & macro targets",
  "Full 1, 2 or 4-week meal plan with portions",
  "Weekly grocery list",
  "2 free refinements",
  "PDF export + printable list",
  "Saved to your account",
];

type CtaState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "has-active"; sessionId: string }
  | { kind: "no-active" };

function Home() {
  const { user, loading } = useAuth();
  const [cta, setCta] = useState<CtaState>({ kind: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCta({ kind: "guest" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("generation_sessions")
        .select("id,credits_used,credits_total,created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      const active = (data ?? []).find((r) => (r.credits_used ?? 0) < (r.credits_total ?? 0));
      if (active) setCta({ kind: "has-active", sessionId: active.id });
      else setCta({ kind: "no-active" });
    })();
  }, [user, loading]);

  const primary = (() => {
    if (cta.kind === "loading") return null;
    if (cta.kind === "has-active")
      return (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/plans/$sessionId" params={{ sessionId: cta.sessionId }}>
            View my diet plan
          </Link>
        </Button>
      );
    if (cta.kind === "no-active")
      return (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/plans">My diet plans</Link>
        </Button>
      );
    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link to="/questionnaire">Create my diet plan</Link>
      </Button>
    );
  })();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="px-5 pt-12 pb-14 sm:pt-20 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <img src={logoUrl} alt="SmartyDiet" width={72} height={72} className="mx-auto h-18 w-18" />

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Your personal nutrition plan, built in minutes.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            A full 1, 2 or 4-week diet plan tailored to your body, goals and food preferences.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {primary}
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          {cta.kind === "guest" && (
            <p className="mt-3 text-xs text-muted-foreground">
              $4.99 one-time · 1 plan + 2 refinements · No subscription.
            </p>
          )}
        </div>
      </section>

      {/* What's included / Pricing — hidden for users with an active plan */}
      {cta.kind !== "has-active" && (
        <section className="border-t border-border px-5 pt-10 pb-10 sm:pt-14 sm:pb-14">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border-2 border-primary bg-card p-5 shadow-soft sm:p-10">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  One-time payment
                </p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight">$4.99</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  One personalized plan. Yours to keep.
                </p>
              </div>
              <ul className="mx-auto mt-6 max-w-md space-y-3">
                {INCLUDES.map((it) => (
                  <li key={it} className="flex items-center gap-3 text-xs sm:text-sm">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                    <span className="whitespace-nowrap">{it}</span>
                  </li>
                ))}
              </ul>
              {cta.kind === "guest" && (
                <>
                  <div className="mt-8 flex justify-center">
                    <Button asChild size="lg">
                      <Link to="/questionnaire">Create my diet plan</Link>
                    </Button>
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Not medical advice. Consult a professional for medical conditions.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
