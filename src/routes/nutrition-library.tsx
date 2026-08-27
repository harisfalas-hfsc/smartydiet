import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Library } from "lucide-react";
import { SmartyCard, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const URL = "https://smartydiet.com/nutrition-library";
const TITLE = "Nutrition Library — every SmartyDiet guide in one place";
const DESCRIPTION =
  "The complete SmartyDiet knowledge hub: nutrition intelligence, the diet science, personalized diet plans, meal planning, sports nutrition and the full nutrition glossary.";

export const Route = createFileRoute("/nutrition-library")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "nutrition library, diet guides, nutrition intelligence, diet science, diet plans, meal planning, sports nutrition, nutrition glossary",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: NutritionLibraryPage,
});

type Section = {
  id: string;
  number: number;
  title: string;
  icon: string;
  summary: string;
  points: string[];
  to: string;
  linkLabel: string;
  extras?: { to: string; label: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "nutrition-intelligence",
    number: 1,
    title: "Nutrition Intelligence",
    icon: "🧠",
    summary:
      "How SmartyDiet turns your answers into numbers: the Smarty Nutrition Score™, Metabolic Age™, Calorie Engine™ and Macro Index™ that sit behind every plan.",
    points: [
      "What each Smarty metric measures and why it matters",
      "How calorie and macro targets are calculated for your body",
      "How the plan adapts as your goals and body change",
    ],
    to: "/nutrition-intelligence",
    linkLabel: "Read Nutrition Intelligence",
  },
  {
    id: "diet-science",
    number: 2,
    title: "The Diet Science",
    icon: "🔬",
    summary:
      "The evidence layer: energy balance, protein intake, meal frequency, fasting windows and how the major diet schedules actually compare.",
    points: [
      "Energy balance, protein targets and what the research supports",
      "Diet schedules compared — Mediterranean, low-carb, high-protein, fasting",
      "What changes body composition versus what only changes the scale",
    ],
    to: "/diet-science",
    linkLabel: "Read The Diet Science",
  },
  {
    id: "diet-plans",
    number: 3,
    title: "Diet Plans",
    icon: "🍽️",
    summary:
      "Personalized meal plans built from your own data — plus focused guides for the three goals people ask for most.",
    points: [
      "What a personalized Smarty Meal Plan™ includes",
      "Weight loss: deficit, protein and hunger control",
      "Muscle gain: surplus, training fuel and protein distribution",
      "High protein: daily targets and the best food sources",
    ],
    to: "/diet-plans",
    linkLabel: "Personalized diet plans",
    extras: [
      { to: "/diet-plans/weight-loss", label: "Weight loss plans" },
      { to: "/diet-plans/muscle-gain", label: "Muscle gain plans" },
      { to: "/diet-plans/high-protein", label: "High protein plans" },
    ],
  },
  {
    id: "meal-planning",
    number: 4,
    title: "Meal Planning Guide",
    icon: "🗓️",
    summary:
      "The practical week: how to build a meal template, prep in components, shop once and stay consistent without eating the same thing daily.",
    points: [
      "The five-step weekly meal plan",
      "Meal templates instead of 21 separate recipes",
      "Prep and grocery list strategies that survive a real week",
    ],
    to: "/meal-planning",
    linkLabel: "Read the meal planning guide",
  },
  {
    id: "sports-nutrition",
    number: 5,
    title: "Sports Nutrition",
    icon: "🏃",
    summary:
      "Eating around training: pre and post-workout meals, carbohydrate and protein needs, hydration and recovery.",
    points: [
      "Energy availability comes before timing and supplements",
      "Pre-workout and post-workout meal structures",
      "Carbohydrate, protein and fluid targets by training load",
    ],
    to: "/sports-nutrition",
    linkLabel: "Read sports nutrition",
  },
  {
    id: "glossary",
    number: 6,
    title: "Nutrition Glossary",
    icon: "📚",
    summary:
      "Plain-English definitions of every nutrition, diet and metabolism term SmartyDiet uses — from BMR and TDEE to the Smarty metrics.",
    points: [
      "25+ nutrition and metabolism terms defined",
      "The Smarty Nutrition Score™, Metabolic Age™ and Macro Index™ explained",
    ],
    to: "/glossary",
    linkLabel: "Open the glossary",
  },
];

function NutritionLibraryPage() {
  const t = toneClasses("cyan");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Nutrition library
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Everything we know, <span className="text-primary">in one place.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Nutrition intelligence, the science, diet plans, meal planning, sports nutrition and the
          full glossary — organized so you can jump straight to what you need.
        </p>
      </div>

      <SmartyCard
        tone="cyan"
        eyebrow="Contents"
        eyebrowIcon="🧭"
        cornerIcon={Library}
        title="Browse the"
        accent="library."
        description="Tap a section to jump to it."
      >
        <nav className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold no-underline transition-colors hover:border-primary",
                t.softBorder,
                t.softBg,
              )}
            >
              <span className="text-lg">{s.icon}</span>
              <span>
                {s.number}. {s.title}
              </span>
            </a>
          ))}
        </nav>
      </SmartyCard>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <SmartyCard
              tone="green"
              eyebrow={`Section ${s.number}`}
              eyebrowIcon={s.icon}
              cornerIcon={BookOpen}
              title={s.title}
              description={s.summary}
            >
              <Accordion type="single" collapsible>
                <AccordionItem value={s.id}>
                  <AccordionTrigger className="text-sm font-semibold">
                    What&apos;s inside
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {s.points.map((p) => (
                        <li key={p}>• {p}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to={s.to}>{s.linkLabel}</Link>
                </Button>
                {(s.extras ?? []).map((e) => (
                  <Button asChild size="sm" variant="outline" key={e.to}>
                    <Link to={e.to}>{e.label}</Link>
                  </Button>
                ))}
              </div>
            </SmartyCard>
          </section>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Build my personalized plan</Link>
        </Button>
      </div>
    </div>
  );
}
