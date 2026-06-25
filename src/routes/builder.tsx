import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Build Your Diet — SmartyDiet" },
      {
        name: "description",
        content:
          "Answer a short questionnaire about your goals, habits and food preferences and we'll generate a personalized diet plan for you.",
      },
      { property: "og:title", content: "Build Your Personal Diet — SmartyDiet" },
      { property: "og:description", content: "Personalized diets from a short questionnaire." },
    ],
  }),
  component: BuilderPage,
});

const STEPS = [
  { n: 1, title: "Your goal", desc: "Lose fat, maintain, gain muscle." },
  { n: 2, title: "About you", desc: "Age, sex, height, weight, activity." },
  { n: 3, title: "Eating habits", desc: "Meals per day, snacks, eating window." },
  { n: 4, title: "Preferences", desc: "Foods you love and foods you avoid." },
  { n: 5, title: "Allergies & restrictions", desc: "Gluten, lactose, religion, ethics." },
  { n: 6, title: "Your plan", desc: "We generate a personalized diet." },
];

function BuilderPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Personalized
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Build Your Diet</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Answer a few quick questions about your goals, body, habits and food preferences.
          We'll build a personalized diet that fits the way you actually eat.
        </p>
      </header>

      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {s.n}
              </span>
              <h3 className="text-base font-bold">{s.title}</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
        <h2 className="text-xl font-bold">Questionnaire coming next</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          The interactive questionnaire and the diet-generation engine will plug in here.
          The structure above is the flow we'll follow.
        </p>
        <button
          type="button"
          disabled
          className="mt-6 inline-flex cursor-not-allowed items-center rounded-md bg-primary/60 px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Start questionnaire (soon)
        </button>
      </div>
    </section>
  );
}
