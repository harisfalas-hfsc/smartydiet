import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Compass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SmartyCard,
  SmartyPill,
  SmartyRow,
  toneClasses,
} from "@/components/SmartyCard";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SmartyDiet — The AI Nutrition Intelligence Platform" },
      {
        name: "description",
        content:
          "SmartyDiet is the AI Nutrition Intelligence Platform — a pocket dietitian and diet coach that builds personalized plans based on established sports-science methods.",
      },
      { property: "og:title", content: "About SmartyDiet — AI Nutrition Intelligence Platform" },
      {
        property: "og:description",
        content:
          "The AI Nutrition Intelligence Platform: pocket dietitian, nutrition consultant and diet coach, powered by science.",
      },
      { property: "og:url", content: "https://smartydiet.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://smartydiet.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const g = toneClasses("green");
  const p = toneClasses("purple");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">About us</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          The <span className="text-primary">AI Nutrition Intelligence</span> Platform
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          SmartyDiet combines personalized diet planning with free tools so anyone can eat
          with intention — no subscription, no guesswork.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <SmartyCard
          tone="green"
          eyebrow="Our mission"
          eyebrowIcon="🌱"
          cornerIcon={Compass}
          title="Nutrition made"
          accent="personal."
          description="We package the assessment, calculation and planning work of a dietitian into an always-available AI — accessible for one $4.99 payment."
        >
          <div className={cn("rounded-2xl border p-4", g.softBorder, g.softBg)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <SmartyPill tone="green" icon="🎯">Personalized to your body</SmartyPill>
              <SmartyPill tone="green" icon="🧪">Evidence-based methods</SmartyPill>
              <SmartyPill tone="green" icon="🔎">Transparent numbers</SmartyPill>
              <SmartyPill tone="green" icon="🚫">No subscription trap</SmartyPill>
            </div>
          </div>

          <div className={cn("mt-4 rounded-2xl border p-4", g.softBorder, g.softBg)}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Smarty family</h3>
            </div>
            <div className="space-y-3">
              <SmartyRow tone="green" icon="🏋️" title="SmartyGym" subtitle="Your smart training partner." />
              <SmartyRow tone="green" icon="🤸" title="SmartyMove" subtitle="Your pocket movement coach." />
            </div>
          </div>
        </SmartyCard>

        <SmartyCard
          tone="purple"
          eyebrow="Our approach"
          eyebrowIcon="🧠"
          cornerIcon={Sparkles}
          title="Built like a"
          accent="dietitian would."
          description="Every plan starts with a smart questionnaire, then the Smarty Calorie Engine™ computes calorie and macro targets using standard methods."
        >
          <div className={cn("rounded-2xl border p-4", p.softBorder, p.softBg)}>
            <div className="space-y-3">
              <SmartyRow tone="purple" icon="📋" title="Smart questionnaire" subtitle="Body, activity, goal, food & allergies." />
              <SmartyRow tone="purple" icon="⚙️" title="Mifflin-St Jeor engine" subtitle="Standard BMR + TDEE multipliers." />
              <SmartyRow tone="purple" icon="🍽️" title="Full personalized plan" subtitle="Meals, macros, portions, grocery list." />
            </div>
          </div>

          <div className={cn("mt-4 rounded-2xl border p-4", p.softBorder, p.softBg)}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Our principles</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SmartyRow tone="purple" icon="🎯" title="Personalization first" subtitle="Plans built around your body and preferences." />
              <SmartyRow tone="purple" icon="🧪" title="Evidence-based" subtitle="Methods used by dietitians." />
              <SmartyRow tone="purple" icon="🔎" title="Transparent" subtitle="See the calories, macros and rationale." />
              <SmartyRow tone="purple" icon="🚫" title="No subscription trap" subtitle="Pay once, own your plan." />
            </div>
          </div>
        </SmartyCard>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Create my diet plan</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/tools">Explore free tools</Link>
        </Button>
      </div>
    </div>
  );
}

