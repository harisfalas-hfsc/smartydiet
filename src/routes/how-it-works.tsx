import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How SmartyDiet works — from questionnaire to your personalized plan" },
      {
        name: "description",
        content:
          "See exactly what SmartyDiet asks, how we build your plan, and what you get back — meals, macros, grocery list and PDF export.",
      },
    ],
  }),
  component: HowItWorks,
});

function Section({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {n}
      </span>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How SmartyDiet works</h1>
      <p className="mt-3 text-muted-foreground">
        A transparent look at what we ask, how we build the plan, and what you'll receive.
      </p>

      <div className="mt-10 space-y-8">
        <Section
          n={1}
          title="Sign in"
          body="Create a SmartyDiet account so your plan is saved and you can come back to it any time."
        />
        <Section
          n={2}
          title="Answer the questionnaire"
          body="Eight short steps: basics, body composition (optional), activity & training, goal, eating preferences, cooking constraints, health screening, and a free-text note. Allergies are required — we never build a plan that could include something you're allergic to."
        />
        <Section
          n={3}
          title="Pick your plan duration"
          body="Choose 1, 2 or 4 weeks. We use your answers to set calorie targets, macro splits, meals per day and food choices."
        />
        <Section
          n={4}
          title="Pay $4.99, once"
          body="A single one-time payment unlocks 1 initial plan generation + 2 refinement credits."
        />
        <Section
          n={5}
          title="Review your plan"
          body="You get a full plan with daily meals, portions, calories & macros, weekly grocery list, and a short rationale explaining why this plan fits your goal."
        />
        <Section
          n={6}
          title="Refine (up to 2 times)"
          body="Don't love breakfast? Want less dairy? More protein? Send a short refinement request and the plan updates."
        />
        <Section
          n={7}
          title="Export & keep"
          body="Download your final plan as a PDF and a printable grocery list. Everything stays in your account."
        />
      </div>

      <div className="mt-12 flex justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Start my plan — $4.99</Link>
        </Button>
      </div>
    </div>
  );
}
