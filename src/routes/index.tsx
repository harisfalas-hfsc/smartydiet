import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import heroNutrition from "@/assets/hero-nutrition.jpg";
import { Testimonials } from "@/components/Testimonials";

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
          "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
      {
        name: "twitter:image",
        content:
          "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
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

function Home() {
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


  const heroCtaLabel =
    cta.kind === "member" ? "View my diet plans" : "Get started";
  const heroCtaTo =
    cta.kind === "member" ? "/plans" : "/questionnaire";

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pb-8 pt-0 sm:pb-12">
      {/* MOBILE — centered, image-free, single screen */}
      <section className="mt-6 text-center sm:hidden">
        <h1 className="text-[34px] font-extrabold uppercase leading-[1.05] tracking-tight text-foreground">
          Your personal nutrition plan
          <br />
          <span className="text-primary">built in minutes</span>
        </h1>

        <p className="mx-auto mt-5 max-w-[22rem] text-[15px] leading-relaxed text-muted-foreground">
          Answer a smart questionnaire. Get a full tailor-made diet plan built
          around your body, goals, food preferences and constraints.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to={heroCtaTo}
            className="flex h-14 w-full items-center justify-center rounded-full bg-primary text-[16px] font-extrabold text-primary-foreground no-underline"
            style={{ textDecoration: "none" }}
          >
            {heroCtaLabel}
          </Link>
          <Link
            to="/how-it-works"
            className="flex h-14 w-full items-center justify-center rounded-full border-2 border-primary text-[16px] font-bold text-primary no-underline"
            style={{ textDecoration: "none" }}
          >
            How it works
          </Link>
          <Link
            to="/tools"
            className="flex h-14 w-full items-center justify-center rounded-full border-2 border-primary text-[16px] font-bold text-primary no-underline"
            style={{ textDecoration: "none" }}
          >
            Free nutrition tools
          </Link>
        </div>

        <p className="mx-auto mt-6 max-w-[22rem] text-[12px] leading-snug text-muted-foreground/70">
          Not medical advice. SmartyDiet is made for healthy people who want to
          enrich their diet and make better food choices.
        </p>
      </section>

      {/* FULL-BLEED HERO — desktop/tablet */}
      <section className="relative left-1/2 mb-0 hidden w-screen -translate-x-1/2 overflow-hidden sm:block">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 lg:px-6 lg:py-36">
          <div className="max-w-xl">
            <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[60px]">
              Your personal nutrition plan,
              <br />
              <span className="text-primary">built in minutes.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/80 lg:mt-6 lg:text-lg">
              Answer a smart questionnaire. Get a full 1, 2 or 4-week diet plan
              tailored to your body, goals, food preferences and constraints.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to={heroCtaTo}
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground no-underline hover:opacity-95"
              >
                {heroCtaLabel}
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex h-12 items-center rounded-full border-2 border-white/80 bg-white/10 px-8 text-base font-bold text-white no-underline backdrop-blur-sm hover:bg-white/20"
              >
                How it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Includes 1 initial plan + 2 refinements.
            </p>
          </div>
        </div>
      </section>

      <Testimonials />

    </div>
  );
}
