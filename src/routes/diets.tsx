import { createFileRoute, Link } from "@tanstack/react-router";
import { DIETS, CALORIE_LEVELS } from "../lib/diets-data";

export const Route = createFileRoute("/diets")({
  head: () => ({
    meta: [
      { title: "Pre-built Diets — SmartyDiet" },
      {
        name: "description",
        content:
          "Browse 7 standard diet plans — Mediterranean, Keto, Carnivore, Vegan, Vegetarian, High Protein and Intermittent Fasting — available at 1000, 1250, 1500, 1750 and 2000 kcal.",
      },
      { property: "og:title", content: "Pre-built Diets — SmartyDiet" },
      { property: "og:description", content: "7 popular diets across 5 calorie levels." },
    ],
  }),
  component: DietsPage,
});

function DietsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Pre-built Diets</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Choose from the 7 most popular diet styles. Each one comes in 5 calorie
          levels: <span className="font-semibold text-foreground">1000, 1250, 1500, 1750 and 2000 kcal</span>.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DIETS.map((d) => (
          <article
            key={d.slug}
            className="hover-lift flex flex-col rounded-xl border border-border bg-card p-6 transition-smooth"
          >
            <span className="text-4xl">{d.emoji}</span>
            <h2 className="mt-3 text-xl font-bold text-foreground">{d.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d.tagline}</p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available at
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CALORIE_LEVELS.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground"
                  >
                    {c} kcal
                  </span>
                ))}
              </div>
            </div>

            <Link
              to="/diets/$slug"
              params={{ slug: d.slug }}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              View {d.name} plans →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
