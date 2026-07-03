import { createFileRoute } from "@tanstack/react-router";
import { Apple } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartyDiet — Smart nutrition, personalized for you" },
      {
        name: "description",
        content:
          "SmartyDiet builds a personalized nutrition plan for your goals, body, habits and food preferences — powered by AI, delivered in minutes.",
      },
      { property: "og:title", content: "SmartyDiet — Smart nutrition, personalized for you" },
      {
        property: "og:description",
        content: "AI-generated personalized diet plans from a smart questionnaire.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Apple className="h-7 w-7 text-primary" strokeWidth={2.25} />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        SMARTY <span className="text-primary">DIET</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
        Coming soon — your personalized AI nutrition plan, built from a smart questionnaire.
      </p>
    </section>
  );
}
