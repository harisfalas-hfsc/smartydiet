import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CALORIE_LEVELS, getDiet } from "../lib/diets-data";

export const Route = createFileRoute("/diets/$slug")({
  loader: ({ params }) => {
    const diet = getDiet(params.slug);
    if (!diet) throw notFound();
    return { diet };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.diet.name ?? "Diet";
    return {
      meta: [
        { title: `${name} Diet — SmartyDiet` },
        { name: "description", content: loaderData?.diet.description ?? "" },
        { property: "og:title", content: `${name} Diet — SmartyDiet` },
        { property: "og:description", content: loaderData?.diet.tagline ?? "" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Diet not found</h1>
      <Link to="/diets" className="mt-4 inline-block text-primary hover:text-primary-hover">
        ← Back to all diets
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: DietDetail,
});

function DietDetail() {
  const { diet } = Route.useLoaderData();

  return (
    <article className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <Link to="/diets" className="text-sm font-semibold text-primary hover:text-primary-hover">
        ← All diets
      </Link>

      <header className="mt-4 flex items-center gap-5">
        <span className="text-6xl">{diet.emoji}</span>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{diet.name}</h1>
          <p className="mt-1 text-muted-foreground">{diet.tagline}</p>
        </div>
      </header>

      <p className="mt-8 text-lg leading-relaxed text-foreground/90">{diet.description}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Highlights
          </h2>
          <ul className="mt-3 space-y-2">
            {diet.highlights.map((h: string) => (
              <li key={h} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Best for
          </h2>
          <p className="mt-3 text-sm text-foreground/90">{diet.bestFor}</p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold tracking-tight">Choose your calorie level</h2>
        <p className="mt-2 text-muted-foreground">
          Select a daily target to view the full {diet.name} meal plan. (Meal plans coming next.)
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CALORIE_LEVELS.map((c) => (
            <button
              key={c}
              type="button"
              className="hover-lift rounded-xl border border-border bg-card p-6 text-center transition-smooth hover:border-primary"
            >
              <p className="text-3xl font-extrabold text-foreground">{c}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                kcal / day
              </p>
              <p className="mt-3 text-xs text-primary">View plan →</p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Full daily meal plans will be populated here in the next step.
        </p>
      </section>
    </article>
  );
}
