import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SmartyDiet — Personalized nutrition, built on science" },
      {
        name: "description",
        content:
          "SmartyDiet builds fully personalized diet plans and free nutrition tools based on established sports-science methods. Part of the Smarty family.",
      },
      { property: "og:title", content: "About SmartyDiet" },
      {
        property: "og:description",
        content: "Personalized nutrition plans and free tools, based on established sports-science methods.",
      },
    ],
  }),
  component: AboutPage,
});

const PRINCIPLES = [
  "Personalization first — plans built around your body, goals and food preferences.",
  "Evidence-based — Mifflin-St Jeor BMR, TDEE and macro splits used by dietitians.",
  "Transparent — you see the calories, macros and rationale behind every plan.",
  "No subscription trap — pay once, own your plan.",
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        About SmartyDiet
      </h1>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">
        SmartyDiet is your smart nutrition companion. We combine personalized diet planning with
        free, easy-to-use tools so anyone can eat with intention — without a subscription, without
        guesswork.
      </p>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Our approach</h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Every SmartyDiet plan starts with a short questionnaire covering your body, activity,
          goals, food preferences and constraints. From there, we compute your calorie and macro
          targets using the Mifflin-St Jeor equation and standard activity multipliers, then build
          a full 1, 2 or 4-week meal plan with portions and a grocery list.
        </p>
        <ul className="mt-6 space-y-3">
          {PRINCIPLES.map((p) => (
            <li key={p} className="flex items-start gap-3 text-sm sm:text-base">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span className="text-foreground">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Part of the Smarty family</h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          SmartyDiet is part of a growing ecosystem of Smarty products focused on health, fitness
          and smart everyday tools — designed to work together and be genuinely useful.
        </p>
      </section>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Create my diet plan</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/tools">Explore free tools</Link>
        </Button>
      </div>
    </div>
  );
}
