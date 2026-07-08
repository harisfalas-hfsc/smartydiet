import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const INCLUDES = [
  "Calorie & macro targets",
  "Full 1, 2 or 4-week meal plan with portions",
  "Weekly grocery list",
  "2 free refinements",
  "PDF export + printable list",
  "Saved to your account",
];

function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Simple pricing. No subscription.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Pay once, get your personalized plan. Come back only if you want a new one.
        </p>
      </div>

      <div className="mt-10 rounded-3xl border-2 border-primary bg-card p-5 shadow-soft sm:p-10">
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
              <span>{it}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link to="/questionnaire">Create my diet plan</Link>
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Not medical advice. Consult a professional for medical conditions.
        </p>
      </div>
    </div>
  );
}
