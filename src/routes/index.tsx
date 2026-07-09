import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Utensils,
  ClipboardList,
  Calculator,
  ShieldCheck,
  Target,
  Leaf,
  FileDown,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SmartyCard, SmartyRow, SmartyPill } from "@/components/SmartyCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "SmartyDiet — Personalized AI diet plans | Your pocket dietitian",
      },
      {
        name: "description",
        content:
          "SmartyDiet builds a personalized 1, 2 or 4-week meal plan tailored to your body, goals, allergies and food preferences. Includes free BMR, TDEE, macro and calorie tools. $4.99 one-time.",
      },
      {
        property: "og:title",
        content:
          "SmartyDiet — Personalized AI diet plans | Your pocket dietitian",
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Top row: hero + best experience + score */}
      <div className="grid gap-8 lg:grid-cols-3">
        <SmartyCard
          tone="green"
          eyebrow="Nutrition Diagnostic"
          eyebrowIcon="🥗"
          cornerIcon={Sparkles}
          title="Know What You Eat."
          accent="Eat Smarter."
          description="Your pocket dietitian, in-app."
          className="lg:col-span-2"
        >
          <p className="text-sm text-muted-foreground">
            A full 1, 2 or 4-week diet plan tailored to your body, goals and food
            preferences.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
        </SmartyCard>


        <SmartyCard
          tone="orange"
          eyebrow="How it works"
          eyebrowIcon="⚡"
          cornerIcon={Sparkles}
          title="Answer."
          accent="Cook. Eat."
          description="Fill in a smart questionnaire, get your plan with meals, portions and macros — plus a grocery list ready to shop."
          ctaLabel="See the steps"
          ctaTo="/how-it-works"
        />

      </div>

      {/* Second row: three feature cards */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <SmartyCard
          tone="purple"
          eyebrow="Safety First"
          eyebrowIcon="🛡️"
          cornerIcon={ShieldCheck}
          title="Allergy-safe"
          accent="by design."
          description="Every allergen you list is excluded from your plan. The AI is instructed to never include something you can't eat."
        >
          <div className="space-y-3">
            <SmartyRow
              tone="purple"
              icon={Target}
              title="Personalized calorie target"
              subtitle="Mifflin-St Jeor BMR + activity multipliers."
            />
            <SmartyRow
              tone="purple"
              icon={Utensils}
              title="Macro split for your goal"
              subtitle="Protein, carbs, fats and fiber tuned to you."
            />
            <SmartyRow
              tone="purple"
              icon={ShieldCheck}
              title="Respects your constraints"
              subtitle="Cooking time, cuisines, budget and schedule."
            />
          </div>
        </SmartyCard>


        <SmartyCard
          tone="cyan"
          eyebrow="Plan"
          eyebrowIcon="🍽️"
          cornerIcon={Utensils}
          title="Smarty"
          accent="Meal Plan™"
          description="A full personalized plan with daily meals, portions, calories & macros — plus a weekly grocery list."
        >
          <div className="space-y-2">
            <SmartyPill tone="cyan" icon="🥑">Meals & snacks daily</SmartyPill>
            <SmartyPill tone="cyan" icon="🛒">Weekly grocery list</SmartyPill>
            <SmartyPill tone="cyan" icon="✏️">2 refinements included</SmartyPill>
            <SmartyPill tone="cyan" icon="📄">PDF export + printable</SmartyPill>
          </div>
          <div className="mt-6">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-500"
            >
              See how it's built →
            </Link>
          </div>
        </SmartyCard>

        <SmartyCard
          tone="yellow"
          eyebrow="Free Tools"
          eyebrowIcon="🧮"
          cornerIcon={Calculator}
          title="Nutrition"
          accent="Calculators"
          description="Free tools you can use without signing up — BMR, TDEE, macros and a calorie counter."
        >
          <div className="space-y-3">
            <SmartyRow
              tone="yellow"
              icon="🔥"
              title="BMR Calculator"
              subtitle="Mifflin-St Jeor equation."
            />
            <SmartyRow
              tone="yellow"
              icon="🥧"
              title="Macro Calculator"
              subtitle="Calories, protein, carbs & fats by goal."
            />
            <SmartyRow
              tone="yellow"
              icon="🍎"
              title="Calorie Counter"
              subtitle="Look up common foods & portions."
            />
          </div>
          <div className="mt-6">
            <Link
              to="/tools"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-500"
            >
              Explore free tools →
            </Link>
          </div>
        </SmartyCard>
      </div>

      {/* Pricing / includes — hide when has active */}
      {cta.kind !== "has-active" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <SmartyCard
            tone="pink"
            eyebrow="One-time payment"
            eyebrowIcon="💳"
            cornerIcon={BadgeCheck}
            title="$4.99"
            accent="once."
            description="One personalized plan. Yours to keep. No subscription, ever."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { icon: "🎯", label: "Calorie & macro targets" },
                { icon: "🗓️", label: "1, 2 or 4-week meal plan" },
                { icon: "🛒", label: "Weekly grocery list" },
                { icon: "✏️", label: "2 free refinements" },
                { icon: "📄", label: "PDF + printable list" },
                { icon: "☁️", label: "Saved to your account" },
              ].map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
            {cta.kind === "guest" && (
              <div className="mt-6">
                <Button asChild size="lg">
                  <Link to="/questionnaire">Create my diet plan — $4.99</Link>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Not medical advice. Consult a professional for medical conditions.
                </p>
              </div>
            )}
          </SmartyCard>

          <SmartyCard
            tone="blue"
            eyebrow="Why SmartyDiet"
            eyebrowIcon="✨"
            cornerIcon={Leaf}
            title="Built like a"
            accent="dietitian would."
            description="Evidence-based methods, transparent numbers, and a plan that respects every constraint you tell us."
          >
            <div className="space-y-3">
              <SmartyRow
                tone="blue"
                icon={ClipboardList}
                title="Smart questionnaire"
                subtitle="Body, goals, activity, allergies, schedule."
              />
              <SmartyRow
                tone="blue"
                icon={Sparkles}
                title="Smarty Calorie Engine™"
                subtitle="Mifflin-St Jeor + macro splits by goal."
              />
              <SmartyRow
                tone="blue"
                icon={FileDown}
                title="Your plan, portable"
                subtitle="Download, print, or open on any device."
              />
            </div>
            <div className="mt-6">
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500"
              >
                About SmartyDiet →
              </Link>
            </div>
          </SmartyCard>
        </div>
      )}
    </div>
  );
}
