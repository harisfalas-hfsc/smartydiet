import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, ClipboardList, Sparkles, FileDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartyDiet — Your personalized AI nutrition plan in minutes" },
      {
        name: "description",
        content:
          "Answer a smart questionnaire, get a fully personalized diet plan built around your body, goals, food preferences and constraints. Just $4.99, one time.",
      },
    ],
  }),
  component: Home,
});

const HOW = [
  {
    icon: ClipboardList,
    title: "Tell us about you",
    text: "A short but thorough questionnaire: body, activity, goal, food preferences, allergies and constraints.",
  },
  {
    icon: Sparkles,
    title: "AI builds your plan",
    text: "Our nutrition AI generates a full 1, 2 or 4-week plan tailored to your calories, macros, budget and cooking time.",
  },
  {
    icon: FileDown,
    title: "Review, refine, export",
    text: "Get 2 free refinements. Export a clean PDF plan and a printable grocery list.",
  },
];

const INCLUDES = [
  "Personalized calorie & macro targets",
  "Full 1 / 2 / 4-week meal plan with portions",
  "Weekly consolidated grocery list",
  "2 free refinements ('less dairy', 'swap breakfasts'…)",
  "PDF export + printable shopping list",
  "Saved to your account, forever",
];

function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="px-5 pt-12 pb-14 sm:pt-20 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Apple className="h-7 w-7 text-primary" strokeWidth={2.25} />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Your personalized <span className="text-primary">nutrition plan</span>,
            built by AI in minutes.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Answer a smart questionnaire. Get a full 1, 2 or 4-week diet plan tailored to your
            body, goals, food preferences and constraints. $4.99 — one-time payment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/questionnaire">Start my plan — $4.99</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Includes 1 initial plan + 2 refinements. No subscription.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30 px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {HOW.map((h) => (
              <div
                key={h.title}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <h.icon className="h-6 w-6 text-primary" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{h.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included / Pricing */}
      <section className="px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
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
                <li key={it} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link to="/questionnaire">Start my plan</Link>
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Not medical advice. Consult a professional for medical conditions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
