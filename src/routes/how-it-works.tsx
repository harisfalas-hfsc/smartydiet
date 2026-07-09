import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  UserRound,
  ClipboardList,
  CalendarDays,
  CreditCard,
  Utensils,
  Wand2,
  FileDown,
} from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How SmartyDiet works — from questionnaire to your Smarty Meal Plan™" },
      {
        name: "description",
        content:
          "See exactly what SmartyDiet asks, how the Smarty Calorie Engine™ builds your plan, and what you get back — meals, macros, grocery list and PDF export.",
      },
      { property: "og:title", content: "How SmartyDiet works" },
      {
        property: "og:description",
        content:
          "From smart questionnaire to a personalized Smarty Meal Plan™ in minutes.",
      },
      { property: "og:url", content: "https://smartydiet.com/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "https://smartydiet.com/how-it-works" }],
  }),
  component: HowItWorks,
});

const STEPS: {
  n: number;
  tone: "green" | "cyan" | "purple" | "orange" | "yellow" | "pink" | "blue";
  eyebrow: string;
  emoji: string;
  title: string;
  accent: string;
  body: string;
  rows: { icon: string; title: string; subtitle: string }[];
}[] = [
  {
    n: 1,
    tone: "green",
    eyebrow: "Step 01",
    emoji: "👤",
    title: "Sign in.",
    accent: "It's yours.",
    body: "Create a SmartyDiet account so your plan is saved and you can come back to it any time.",
    rows: [
      { icon: "🔒", title: "Private by design", subtitle: "Your data is tied to your account." },
      { icon: "☁️", title: "Always available", subtitle: "Open on any device, any time." },
    ],
  },
  {
    n: 2,
    tone: "cyan",
    eyebrow: "Step 02",
    emoji: "📝",
    title: "Answer the",
    accent: "questionnaire.",
    body: "Eight short steps: basics, body composition, activity & training, goal, eating preferences, cooking constraints, health screening and a free note. Allergies are required.",
    rows: [
      { icon: "🥗", title: "Food preferences", subtitle: "Cuisines, likes and dislikes." },
      { icon: "⚠️", title: "Allergies & health", subtitle: "Every allergen is excluded from the plan." },
      { icon: "🎯", title: "Your goal", subtitle: "Lose, maintain, recomp or gain." },
    ],
  },
  {
    n: 3,
    tone: "purple",
    eyebrow: "Step 03",
    emoji: "📅",
    title: "Pick your",
    accent: "plan duration.",
    body: "Choose 1, 2 or 4 weeks. We use your answers to set calorie targets, macro splits, meals per day and food choices.",
    rows: [
      { icon: "🗓️", title: "1, 2 or 4 weeks", subtitle: "You choose how long." },
      { icon: "⚖️", title: "Calorie & macro targets", subtitle: "Set from your body and goal." },
    ],
  },
  {
    n: 4,
    tone: "orange",
    eyebrow: "Step 04",
    emoji: "💳",
    title: "Pay $4.99,",
    accent: "once.",
    body: "A single one-time payment unlocks 1 initial plan generation + 2 refinement credits.",
    rows: [
      { icon: "💳", title: "One-time payment", subtitle: "No subscription. Ever." },
      { icon: "✏️", title: "2 refinement credits", subtitle: "Tweak your plan twice at no extra cost." },
    ],
  },
  {
    n: 5,
    tone: "yellow",
    eyebrow: "Step 05",
    emoji: "🍽️",
    title: "Review your",
    accent: "Smarty Meal Plan™.",
    body: "You get a full plan with daily meals, portions, calories & macros, weekly grocery list, and a rationale explaining why this plan fits your goal.",
    rows: [
      { icon: "🥑", title: "Meals & portions", subtitle: "Breakfast, lunch, dinner & snacks." },
      { icon: "🛒", title: "Grocery list", subtitle: "Sorted by category, ready to shop." },
      { icon: "🧠", title: "Plan rationale", subtitle: "See why every choice was made." },
    ],
  },
  {
    n: 6,
    tone: "pink",
    eyebrow: "Step 06",
    emoji: "✏️",
    title: "Refine",
    accent: "up to 2 times.",
    body: "Don't love breakfast? Want less dairy? More protein? Send a short refinement request and the plan updates.",
    rows: [
      { icon: "🔁", title: "Free swaps", subtitle: "Change meals, macros or ingredients." },
      { icon: "🤖", title: "AI-assisted", subtitle: "The plan re-generates around your notes." },
    ],
  },
  {
    n: 7,
    tone: "blue",
    eyebrow: "Step 07",
    emoji: "📄",
    title: "Export &",
    accent: "keep.",
    body: "Download your final plan as a PDF and a printable grocery list. Everything stays in your account.",
    rows: [
      { icon: "📥", title: "PDF export", subtitle: "Take your plan anywhere." },
      { icon: "🖨️", title: "Printable grocery list", subtitle: "One-page, sorted by aisle." },
    ],
  },
];

const iconFor: Record<number, typeof UserRound> = {
  1: UserRound,
  2: ClipboardList,
  3: CalendarDays,
  4: CreditCard,
  5: Utensils,
  6: Wand2,
  7: FileDown,
};

function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          How it works
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          From questionnaire to <span className="text-primary">Smarty Meal Plan™</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          A transparent look at what we ask, how we build the plan, and what you'll receive.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <SmartyCard
            key={s.n}
            tone={s.tone}
            eyebrow={s.eyebrow}
            eyebrowIcon={s.emoji}
            cornerIcon={iconFor[s.n]}
            title={s.title}
            accent={s.accent}
            description={s.body}
          >
            <div className="space-y-3">
              {s.rows.map((r) => (
                <SmartyRow
                  key={r.title}
                  tone={s.tone}
                  icon={r.icon}
                  title={r.title}
                  subtitle={r.subtitle}
                />
              ))}
            </div>
          </SmartyCard>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Start my plan — $4.99</Link>
        </Button>
      </div>
    </div>
  );
}
