import { createFileRoute, Link } from "@tanstack/react-router";
import { ARTICLES } from "../lib/articles-data";

export const Route = createFileRoute("/nutrition")({
  head: () => ({
    meta: [
      { title: "Nutrition Articles — SmartyDiet" },
      {
        name: "description",
        content:
          "Science-based articles on calories, macros, meal timing, hydration and sustainable eating habits — written in the same style as the Smarty family blog.",
      },
      { property: "og:title", content: "Nutrition Articles — SmartyDiet" },
      { property: "og:description", content: "Calories, macros, habits and more." },
    ],
  }),
  component: NutritionPage,
});

function NutritionPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Nutrition Articles</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Practical, science-based nutrition articles — same voice and structure as
          the Smarty family blog.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a) => (
          <Link
            key={a.slug}
            to="/nutrition/$slug"
            params={{ slug: a.slug }}
            className="hover-lift rounded-xl border border-border bg-card p-6 transition-smooth"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {a.category}
            </span>
            <h2 className="mt-2 text-lg font-bold text-foreground">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
            <p className="mt-4 text-xs text-muted-foreground">{a.readMinutes} min read</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
