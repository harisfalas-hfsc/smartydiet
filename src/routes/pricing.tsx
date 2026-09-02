import { createFileRoute, Link, Navigate, redirect } from "@tanstack/react-router";
import { getFreeAccessMode } from "@/lib/free-access.functions";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { Button } from "@/components/ui/button";
import { HandCoins } from "lucide-react";
import { SmartyCard, SmartyPill, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";
import { EmailCapture } from "@/components/EmailCapture";
import { Testimonials, TrustBar } from "@/components/Testimonials";
import { StartPlanLink } from "@/components/StartPlanLink";

export const Route = createFileRoute("/pricing")({
  loader: async () => {
    let free = false;
    try {
      free = (await getFreeAccessMode()).freeAccessMode;
    } catch {
      free = false;
    }
    // Free Access Mode: this page must not exist at all, not even in SSR HTML.
    if (free) throw redirect({ to: "/" });
    return { freeAccessMode: free };
  },
  head: ({ loaderData }) =>
    loaderData?.freeAccessMode === true
      ? { meta: [{ title: "SmartyDiet" }] }
      : {
    meta: [
      { title: "Pricing — SmartyDiet AI diet plan for €9.99, one-time" },
      {
        name: "description",
        content:
          "One personalized Smarty Meal Plan™ for €9.99. Includes 1- or 2-week meal plan, macros, grocery list, 1 free refinement and PDF export. No subscription.",
      },
      { property: "og:title", content: "SmartyDiet Pricing — €9.99 one-time" },
      {
        property: "og:description",
        content: "One personalized Smarty Meal Plan™. Yours to keep. No subscription.",
      },
      { property: "og:url", content: "https://smartydiet.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://smartydiet.com/pricing" }],
  },
  component: PricingPage,
});

const INCLUDES: { icon: string; label: string }[] = [
  { icon: "🎯", label: "Calorie & macro targets" },
  { icon: "🗓️", label: "1- or 2-week meal plan" },
  { icon: "🛒", label: "Weekly grocery list" },
  { icon: "✏️", label: "1 free refinement" },
  { icon: "📄", label: "PDF export + printable list" },
  { icon: "☁️", label: "Saved to your account" },
];

const FREE_TOOLS: { icon: string; label: string }[] = [
  { icon: "🔥", label: "BMR Calculator" },
  { icon: "🥧", label: "Macro Calculator" },
  { icon: "🍎", label: "Calorie Counter" },
];

function PricingPage() {
  const { freeAccessMode, loading } = useFreeAccessMode();
  const t = toneClasses("pink");
  if (loading) return null;
  if (freeAccessMode) return <Navigate to="/" replace />;
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

      <SmartyCard
        tone="pink"
        eyebrow="One-time payment"
        eyebrowIcon="💳"
        cornerIcon={HandCoins}
        title="€9.99"
        accent="once."
        description="One personalized plan. Yours to keep. No subscription, no hidden add-ons, no monthly fee."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className={cn(
              "rounded-2xl border p-4",
              t.softBorder,
              t.softBg,
            )}
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Your plan includes
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {INCLUDES.map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border p-4",
              t.softBorder,
              t.softBg,
            )}
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Free tools
            </h3>
            <div className="grid gap-2">
              {FREE_TOOLS.map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Use BMR, TDEE, macro and calorie counter — no account required.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <StartPlanLink>Create my diet plan — €9.99</StartPlanLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Not medical advice. Consult a professional for medical conditions.
        </p>
      </SmartyCard>

      <TrustBar className="mt-6" />
      <Testimonials />
      <EmailCapture
        source="pricing"
        className="mt-6"
        title="Not ready yet? Get free nutrition tips"
        subtitle="Leave your email and we'll send practical tips plus new tools. No spam, unsubscribe any time."
      />
    </div>
  );
}

