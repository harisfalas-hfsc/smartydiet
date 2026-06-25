import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Apple, ChefHat, BookOpen, Calculator, Sparkles } from "lucide-react";
import { DIETS } from "../lib/diets-data";
import { ARTICLES } from "../lib/articles-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartyDiet — Smart nutrition companion & personalized diet plans" },
      {
        name: "description",
        content:
          "Pre-built diet plans (Mediterranean, Keto, Vegan, High Protein and more), a personal diet builder, nutrition articles and calorie & macro tracking tools.",
      },
      { property: "og:title", content: "SmartyDiet — Smart Nutrition Companion" },
      { property: "og:description", content: "Personalized diets, nutrition articles and tracking tools." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Part of the Smarty family
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Smart nutrition.<br />
              <span className="text-primary">Personalized for you.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              SmartyDiet brings together pre-built diet plans, a personal diet builder,
              tracking tools for calories and macros, and a growing library of
              science-based nutrition articles — all in one simple place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/builder"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Build my diet <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/diets"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Browse ready-made diets
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Apple className="h-6 w-6 text-primary" />
                </span>
                <p className="text-xl font-extrabold tracking-tight">
                  SMARTY <span className="text-primary">DIET</span>
                </p>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Your smart nutrition companion. SmartyDiet brings together personalized
                diet plans, smart tools for tracking calories and macros, food and recipe
                guidance, and a growing library of blog articles covering everything you
                need to know about nutrition, healthy eating and sustainable habits — all
                in one simple, science-based place.
              </p>
              <Link
                to="/about"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
              >
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { icon: ChefHat, title: "Ready-made diets", desc: "7 popular diets at 5 calorie levels.", to: "/diets" },
            { icon: Sparkles, title: "Build your diet", desc: "Answer a quick questionnaire and get a plan.", to: "/builder" },
            { icon: BookOpen, title: "Nutrition articles", desc: "Science-based, written by us.", to: "/nutrition" },
            { icon: Calculator, title: "Tracking tools", desc: "Calorie & macro tracker.", to: "/tools" },
          ].map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="hover-lift rounded-xl border border-border bg-card p-6 transition-smooth"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured diets */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Popular diets</h2>
            <p className="mt-2 text-muted-foreground">
              7 standard diets at 1000, 1250, 1500, 1750 and 2000 kcal.
            </p>
          </div>
          <Link to="/diets" className="hidden text-sm font-semibold text-primary hover:text-primary-hover md:inline">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DIETS.slice(0, 4).map((d) => (
            <Link
              key={d.slug}
              to="/diets/$slug"
              params={{ slug: d.slug }}
              className="hover-lift group rounded-xl border border-border bg-card p-6 transition-smooth"
            >
              <span className="text-3xl">{d.emoji}</span>
              <h3 className="mt-3 text-lg font-bold text-foreground group-hover:text-primary">
                {d.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Articles teaser */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight">From the nutrition blog</h2>
          <Link to="/nutrition" className="hidden text-sm font-semibold text-primary hover:text-primary-hover md:inline">
            All articles →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {ARTICLES.slice(0, 3).map((a) => (
            <Link
              key={a.slug}
              to="/nutrition/$slug"
              params={{ slug: a.slug }}
              className="hover-lift rounded-xl border border-border bg-card p-6 transition-smooth"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{a.category}</span>
              <h3 className="mt-2 text-lg font-bold text-foreground">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
              <p className="mt-4 text-xs text-muted-foreground">{a.readMinutes} min read</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
