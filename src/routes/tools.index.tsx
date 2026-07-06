import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, PieChart, Calculator, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "SmartyDiet Tools — Free nutrition calculators" },
      {
        name: "description",
        content:
          "Free SmartyDiet nutrition tools: BMR calculator (Mifflin-St Jeor), macro calculator and calorie & macro lookup. No signup required.",
      },
      { property: "og:title", content: "SmartyDiet Tools — Free nutrition calculators" },
      {
        property: "og:description",
        content: "BMR, macros and calorie lookup — free tools by SmartyDiet.",
      },
    ],
  }),
  component: ToolsPage,
});

const TOOLS = [
  {
    to: "/tools/bmr-calculator" as const,
    title: "BMR Calculator",
    description:
      "Calculate your basal metabolic rate and daily calorie needs using the Mifflin-St Jeor equation.",
    Icon: Flame,
  },
  {
    to: "/tools/macro-calculator" as const,
    title: "Macro Calculator",
    description:
      "Get personalized calories, protein, carbs, fats, fiber and water targets based on your goal.",
    Icon: PieChart,
  },
  {
    to: "/tools/calorie-counter" as const,
    title: "Calorie Counter",
    description:
      "Look up calories and macros for common foods and calculate totals for any portion size.",
    Icon: Calculator,
  },
];

function ToolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyDiet Tools
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Free nutrition tools
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Simple, science-based calculators you can use without signing up.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ to, title, description, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Open tool
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
