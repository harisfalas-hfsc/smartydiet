import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, HeartPulse, Users, Compass } from "lucide-react";
import { SmartyCard, SmartyRow, SmartyPill } from "@/components/SmartyCard";

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

      <div className="grid gap-8 lg:grid-cols-3">
        <SmartyCard
          tone="green"
          eyebrow="Our mission"
          eyebrowIcon="🌱"
          cornerIcon={Compass}
          title="Nutrition made"
          accent="personal."
          description="We package the assessment, calculation and planning work of a dietitian into an always-available AI — accessible for one $4.99 payment."
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyPill tone="green" icon="🎯">Personalized to your body</SmartyPill>
            <SmartyPill tone="green" icon="🧪">Evidence-based methods</SmartyPill>
            <SmartyPill tone="green" icon="🔎">Transparent numbers</SmartyPill>
            <SmartyPill tone="green" icon="🚫">No subscription trap</SmartyPill>
          </div>
        </SmartyCard>

        <SmartyCard
          tone="orange"
          eyebrow="Smarty family"
          eyebrowIcon="✨"
          cornerIcon={Users}
          title="Smarty"
          accent="family."
          description="SmartyDiet is part of a growing ecosystem of Smarty products focused on health, fitness and smart everyday tools — designed to work together."
        >
          <div className="space-y-3">
            <SmartyRow tone="orange" icon="🏋️" title="SmartyGym" subtitle="Your smart training partner." />
            <SmartyRow tone="orange" icon="🤸" title="SmartyMove" subtitle="Your pocket movement coach." />
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
          <div className="space-y-3">
            <SmartyRow tone="purple" icon="📋" title="Smart questionnaire" subtitle="Body, activity, goal, food & allergies." />
            <SmartyRow tone="purple" icon="⚙️" title="Mifflin-St Jeor engine" subtitle="Standard BMR + TDEE multipliers." />
            <SmartyRow tone="purple" icon="🍽️" title="Full personalized plan" subtitle="Meals, macros, portions, grocery list." />
          </div>
        </SmartyCard>

        <SmartyCard
          tone="cyan"
          eyebrow="Our principles"
          eyebrowIcon="🎯"
          cornerIcon={HeartPulse}
          title="What we"
          accent="stand for."
          description="Four commitments we don't compromise on."
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyRow tone="cyan" icon="🎯" title="Personalization first" subtitle="Plans built around your body and preferences." />
            <SmartyRow tone="cyan" icon="🧪" title="Evidence-based" subtitle="Methods used by dietitians." />
            <SmartyRow tone="cyan" icon="🔎" title="Transparent" subtitle="See the calories, macros and rationale." />
            <SmartyRow tone="cyan" icon="🚫" title="No subscription trap" subtitle="Pay once, own your plan." />
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
