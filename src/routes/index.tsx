import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/smartydiet-logo.png";
import { SmartyCard } from "@/components/SmartyCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "SmartyDiet — Your personal nutrition plan, built in minutes",
      },
      {
        name: "description",
        content:
          "Answer a smart questionnaire, get a fully personalized diet plan built around your body, goals, food preferences and constraints. Just €9.99, one time.",
      },
      {
        property: "og:title",
        content: "SmartyDiet — Your personal nutrition plan, built in minutes",
      },
      {
        property: "og:description",
        content:
          "Personalized AI meal plans with grocery list, macros and PDF export. Plus free BMR, TDEE, macro and calorie tools.",
      },
      { property: "og:url", content: "https://smartydiet.com/" },
      {
        property: "og:image",
        content:
          "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
      {
        name: "twitter:image",
        content:
          "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://smartydiet.com/" }],
  }),
  component: Home,
});

type CtaState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "has-active"; sessionId: string }
  | { kind: "no-active" };

const STEPS = [
  {
    n: 1,
    color: "text-emerald-500",
    title: "Answer",
    desc: "A short questionnaire about you.",
  },
  {
    n: 2,
    color: "text-orange-500",
    title: "Build",
    desc: "We generate your tailored plan.",
  },
  {
    n: 3,
    color: "text-sky-500",
    title: "Get",
    desc: "Meals, macros & grocery list.",
  },
];

const INCLUDES = [
  "Calorie & macro targets",
  "Full 1, 2 or 4-week meal plan",
  "Weekly grocery list",
  "2 free refinements",
  "PDF export + printable list",
  "Saved to your account",
];

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
      const active = (data ?? []).find(
        (r) => (r.credits_used ?? 0) < (r.credits_total ?? 0),
      );
      if (active) setCta({ kind: "has-active", sessionId: active.id });
      else setCta({ kind: "no-active" });
    })();
  }, [user, loading]);

  const primary = (() => {
    if (cta.kind === "loading")
      return (
        <Button size="lg" disabled className="w-full sm:w-auto">
          Get started
        </Button>
      );
    if (cta.kind === "has-active")
      return (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/plans">View my diet plans</Link>
        </Button>
      );

    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link to="/questionnaire">Get started</Link>
      </Button>
    );
  })();


  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-8 sm:py-12">
      {/* Hero */}
      <section className="px-5 pb-10 pt-8 text-center sm:pb-14 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <img
            src={logoUrl}
            alt="SmartyDiet"
            width={72}
            height={72}
            className="mx-auto h-18 w-18"
          />
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Your personal nutrition plan, built in minutes.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Answer a smart questionnaire. Get a full 1, 2 or 4-week diet plan
            tailored to your body, goals, food preferences and constraints.
            €9.99 — one-time payment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {primary}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          {cta.kind === "guest" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Includes 1 initial plan + 2 refinements. No subscription.
            </p>
          )}
        </div>
      </section>

      {/* Single info card */}
      <section className="mx-auto w-full max-w-4xl">
        <SmartyCard
          tone="green"
          eyebrow="How it works"
          eyebrowIcon="🥗"
          cornerIcon={Sparkles}
          title="From questionnaire"
          accent="to plan."
          description="Three steps. One payment. No subscription."
        >
          <div className="mt-2 grid gap-6 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`text-5xl font-black leading-none ${s.color}`}
                >
                  {s.n}
                </div>
                <div className="mt-3 whitespace-nowrap text-base font-bold">
                  {s.title}
                </div>
                <div className="mt-1 whitespace-nowrap text-sm text-muted-foreground">
                  {s.desc}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-8">
            <h3 className="text-center text-lg font-bold">What&apos;s included</h3>
            <ul className="mx-auto mt-5 grid max-w-lg gap-3 sm:grid-cols-2">
              {INCLUDES.map((it) => (
                <li key={it} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                  <span className="whitespace-nowrap">{it}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              One-time payment
            </p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight">
              €9.99
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              One personalized plan. Yours to keep.
            </p>
            <div className="mt-6 flex justify-center">{primary}</div>
            {cta.kind === "guest" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Not medical advice. Consult a professional for medical
                conditions.
              </p>
            )}
          </div>
        </SmartyCard>
      </section>
    </div>
  );
}
