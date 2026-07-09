import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Sparkles, HandCoins } from "lucide-react";
import { SmartyCard, SmartyPill, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SmartyDiet AI diet plan for $4.99, one-time" },
      {
        name: "description",
        content:
          "One personalized Smarty Meal Plan™ for $4.99. Includes 1, 2 or 4-week meal plan, macros, grocery list, 2 free refinements and PDF export. No subscription.",
      },
      { property: "og:title", content: "SmartyDiet Pricing — $4.99 one-time" },
      {
        property: "og:description",
        content: "One personalized Smarty Meal Plan™. Yours to keep. No subscription.",
      },
      { property: "og:url", content: "https://smartydiet.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://smartydiet.com/pricing" }],
  }),
  component: PricingPage,
});

const INCLUDES: { icon: string; label: string }[] = [
  { icon: "🎯", label: "Calorie & macro targets" },
  { icon: "🗓️", label: "1, 2 or 4-week meal plan" },
  { icon: "🛒", label: "Weekly grocery list" },
  { icon: "✏️", label: "2 free refinements" },
  { icon: "📄", label: "PDF export + printable list" },
  { icon: "☁️", label: "Saved to your account" },
];

function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Pricing
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Simple pricing. <span className="text-primary">No subscription.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Pay once, get your personalized plan. Come back only if you want a new one.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <SmartyCard
          tone="pink"
          eyebrow="One-time payment"
          eyebrowIcon="💳"
          cornerIcon={HandCoins}
          title="$4.99"
          accent="once."
          description="One personalized plan. Yours to keep."
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INCLUDES.map((it) => (
              <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                {it.label}
              </SmartyPill>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/questionnaire">Create my diet plan — $4.99</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Not medical advice. Consult a professional for medical conditions.
          </p>
        </SmartyCard>

        <SmartyCard
          className="hidden md:flex"
          tone="green"
          eyebrow="What's included"
          eyebrowIcon="✅"
          cornerIcon={BadgeCheck}
          title="Everything"
          accent="in one price."
          description="No hidden add-ons. No upsell. No monthly fee."
        >
          <div className="space-y-3">
            <SmartyRow tone="green" icon="🧠" title="Smart questionnaire" subtitle="8 short steps." />
            <SmartyRow tone="green" icon="⚙️" title="Smarty Calorie Engine™" subtitle="Personalized targets." />
            <SmartyRow tone="green" icon="🍽️" title="Full meal plan" subtitle="Portions + macros." />
            <SmartyRow tone="green" icon="🛒" title="Grocery list" subtitle="Sorted by category." />
          </div>
        </SmartyCard>

        <SmartyCard
          tone="cyan"
          eyebrow="Free tools"
          eyebrowIcon="🧮"
          cornerIcon={Sparkles}
          title="Bonus:"
          accent="free calculators."
          description="Use our BMR, TDEE, macro and calorie counter — no account required."
          ctaLabel="Open free tools"
          ctaTo="/tools"
          className="hidden lg:col-span-3 md:flex"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <SmartyPill tone="cyan" icon="🔥">BMR Calculator</SmartyPill>
            <SmartyPill tone="cyan" icon="🥧">Macro Calculator</SmartyPill>
            <SmartyPill tone="cyan" icon="🍎">Calorie Counter</SmartyPill>
          </div>
        </SmartyCard>
      </div>
    </div>
  );
}
