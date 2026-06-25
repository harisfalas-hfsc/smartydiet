import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/macro-tracker")({
  head: () => ({
    meta: [
      { title: "Macro Tracker — SmartyDiet" },
      {
        name: "description",
        content: "Track your protein, carbs and fat per meal and per day.",
      },
      { property: "og:title", content: "Macro Tracker — SmartyDiet" },
      { property: "og:description", content: "Protein, carbs and fat tracking." },
    ],
  }),
  component: MacroTracker,
});

function MacroTracker() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <Link to="/tools" className="text-sm font-semibold text-primary hover:text-primary-hover">
        ← All tools
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Macro Tracker</h1>
      <p className="mt-3 text-muted-foreground">
        Track protein, carbs and fat per meal and per day.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Protein", color: "from-primary/80 to-primary" },
          { label: "Carbs", color: "from-chart-3/80 to-chart-3" },
          { label: "Fat", color: "from-chart-4/80 to-chart-4" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold">0 g</p>
            <p className="mt-1 text-xs text-muted-foreground">/ daily target</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
        <p className="text-lg font-semibold">Macro tracker UI placeholder</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Food search, per-meal breakdowns and progress rings will live here.
        </p>
      </div>
    </section>
  );
}
