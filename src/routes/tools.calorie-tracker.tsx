import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/calorie-tracker")({
  head: () => ({
    meta: [
      { title: "Calorie Tracker — SmartyDiet" },
      {
        name: "description",
        content: "Log foods throughout your day and instantly see your total calorie intake.",
      },
      { property: "og:title", content: "Calorie Tracker — SmartyDiet" },
      { property: "og:description", content: "Track your daily calories." },
    ],
  }),
  component: CalorieTracker,
});

function CalorieTracker() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <Link to="/tools" className="text-sm font-semibold text-primary hover:text-primary-hover">
        ← All tools
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Calorie Tracker</h1>
      <p className="mt-3 text-muted-foreground">
        Add foods to your day and see your total calorie intake.
      </p>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
        <p className="text-lg font-semibold">Tracker UI placeholder</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          We'll plug in a food search, a meal list and a daily totals panel here.
        </p>
      </div>
    </section>
  );
}
