import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, PieChart } from "lucide-react";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Nutrition Tools — SmartyDiet" },
      {
        name: "description",
        content:
          "Log your meals, count calories, and track macros (protein, carbs, fat). Simple tools to know exactly what you're eating.",
      },
      { property: "og:title", content: "Nutrition Tools — SmartyDiet" },
      { property: "og:description", content: "Calorie tracker, macro tracker and more." },
    ],
  }),
  component: ToolsPage,
});

const TOOLS = [
  {
    to: "/tools/calorie-tracker" as const,
    icon: Flame,
    title: "Calorie Tracker",
    desc: "Add foods to your day and instantly see total calories.",
  },
  {
    to: "/tools/macro-tracker" as const,
    icon: PieChart,
    title: "Macro Tracker",
    desc: "Track protein, carbs and fat per meal and per day.",
  },
];

function ToolsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Nutrition Tools</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Add foods to your day and see your calories and macros at a glance.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="hover-lift rounded-xl border border-border bg-card p-8 transition-smooth"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <t.icon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-foreground">{t.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <span className="mt-5 inline-block text-sm font-semibold text-primary">Open tool →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
