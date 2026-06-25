import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SmartyDiet" },
      {
        name: "description",
        content:
          "SmartyDiet is part of the Smarty family (SmartyGym, SmartyMove). Personalized nutrition, tracking tools and science-based articles in one place.",
      },
      { property: "og:title", content: "About SmartyDiet" },
      { property: "og:description", content: "Part of the Smarty family." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">About SmartyDiet</h1>
      <p className="mt-5 text-lg text-muted-foreground">
        SmartyDiet is your smart nutrition companion. It brings together personalized
        diet plans, smart tools for tracking calories and macros, food and recipe
        guidance, and a growing library of blog articles covering everything you need
        to know about nutrition, healthy eating and sustainable habits — all in one
        simple, science-based place.
      </p>
      <p className="mt-5 text-muted-foreground">
        SmartyDiet is part of the Smarty family, alongside{" "}
        <a href="https://smartygym.lovable.app" className="font-semibold text-primary hover:underline">
          SmartyGym
        </a>{" "}
        and{" "}
        <a href="https://smarty-motion-pro.lovable.app" className="font-semibold text-primary hover:underline">
          SmartyMove
        </a>
        .
      </p>
    </section>
  );
}
