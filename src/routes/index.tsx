import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import heroNutrition from "@/assets/hero-nutrition.jpg";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "SmartyDiet — Your personal nutrition plan, built in minutes",
      },
      {
        name: "description",
        content:
          "Answer a smart questionnaire, get a fully personalized diet plan built around your body, goals, food preferences and constraints.",
      },
      {
        property: "og:title",
        content: "SmartyDiet — Your personal nutrition plan, built in minutes",
      },
      {
        property: "og:description",
        content:
          "Personalized AI meal plans with grocery list, macros and PDF export. Plus free BMR, TDEE, macro and calorie tools.",
      },
      { property: "og:url", content: "https://smartydiet.com/" },
      {
        property: "og:image",
        content:
          "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c971/smartydiet-social.png",
      },
      {
        name: "twitter:image",
        content:
          "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c971/smartydiet-social.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://smartydiet.com/" }],
  }),
  component: Home,
});

type CtaState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "member" };

const INCLUDES = [
  "Calorie & macro targets",
  "Full 1, 2 or 4-week meal plan",
  "Weekly grocery list",
  "2 free refinements",
  "PDF export + printable list",
  "Saved to your account",
];

function Home() {
  const { freeAccessMode } = useFreeAccessMode();
  const { user, loading } = useAuth();
  const [cta, setCta] = useState<CtaState>({ kind: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCta({ kind: "guest" });
      return;
    }
    setCta({ kind: "member" });
  }, [user, loading]);

  const primary = (() => {
    if (cta.kind === "loading")
      return (
        <Button size="lg" disabled className="w-full sm:w-auto">
          Get started
        </Button>
      );
    if (cta.kind === "member")
      return (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/plans">View my diet plans</Link>
        </Button>
      );

    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link to="/questionnaire">Get started</Link>
      </Button>
    );
  })();

  const heroCtaLabel =
    cta.kind === "member" ? "View my diet plans" : "Get started";
  const heroCtaTo =
    cta.kind === "member" ? "/plans" : "/questionnaire";

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pb-8 pt-0 sm:pb-12">
      {/* MOBILE — clean cards, no image */}
      <section className="mt-4 mb-4 rounded-[15px] border-[1.5px] border-sky-300/70 bg-card p-6 shadow-[0_12px_36px_-28px_rgba(0,0,0,0.8)] sm:hidden">
        <h1 className="text-[28px] font-black leading-[1.1] tracking-tight text-foreground">
          Your personal nutrition plan,
          <br />
          <span className="text-primary">built in minutes.</span>
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Answer a smart questionnaire and get a full 1, 2 or 4-week diet plan
          tailored to your body, goals and food preferences. No appointments,
          no nutritionist visits.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Link
            to={heroCtaTo}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground"
          >
            {heroCtaLabel}
          </Link>
        </div>
      </section>

      <section className="mb-4 rounded-[15px] border-[1.5px] border-emerald-300/50 bg-card p-6 sm:hidden">
        <h2 className="text-[15px] font-extrabold uppercase tracking-wide text-foreground">
          What you get
        </h2>
        <ul className="mt-4 grid gap-2.5">
          {INCLUDES.map((it) => (
            <li
              key={it}
              className="flex items-start gap-2.5 text-[14px] leading-snug text-muted-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <span>{it}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[12px] leading-snug text-muted-foreground/70">
          This is not medical advice. Smarty Diet is designed for healthy people
          who want to enrich their diet, understand what they eat, and make
          better food choices.
        </p>
      </section>

      {/* FULL-BLEED HERO — desktop/tablet, expanded single card */}
      <section className="relative left-1/2 mb-8 hidden w-screen -translate-x-1/2 overflow-hidden sm:mb-14 sm:block">
        <img
          src={heroNutrition}
          alt="Fresh healthy food ingredients arranged for a personalized nutrition plan"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 lg:px-6 lg:py-28">
          <div className="max-w-2xl rounded-[20px] border border-white/10 bg-black/45 p-8 backdrop-blur-md lg:p-10">
            <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[54px]">
              Your personal nutrition plan,
              <br />
              <span className="text-primary">built in minutes.</span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-white/85 lg:text-lg">
              Answer a smart questionnaire. Get a full 1, 2 or 4-week diet plan
              tailored to your body, your goals, your food preferences and your
              constraints.
            </p>
            <p className="mt-3 text-base leading-relaxed text-white/70 lg:text-lg">
              No more appointments, no more visits to the nutritionist. Use the
              power of Smarty Diet to have your personalized diet schedule ready
              whenever you need it.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {INCLUDES.map((it) => (
                <li
                  key={it}
                  className="flex items-center gap-3 text-sm text-white/90"
                >
                  <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 text-base font-bold"
              >
                <Link to={heroCtaTo}>{heroCtaLabel}</Link>
              </Button>
            </div>


            <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/45">
              This is not medical advice. Smarty Diet is designed for healthy
              people who want to enrich their diet, understand what they eat,
              and make better food choices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
