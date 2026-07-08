import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://smartydiet.com/nutrition-intelligence";
const TITLE =
  "Nutrition Intelligence — The AI Nutrition Intelligence Platform | SmartyDiet";
const DESCRIPTION =
  "What nutrition intelligence is, why it matters, and how SmartyDiet's Smarty Nutrition Score™ and Metabolic Age™ turn assessment into a personalized meal plan.";

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${URL}#webpage`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": "https://smartydiet.com/#website" },
      about: [
        "Nutrition Intelligence",
        "AI Nutrition Analysis",
        "Personalized Nutrition",
        "Metabolic Health",
      ],
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "h2", "article p"],
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartydiet.com/" },
        { "@type": "ListItem", position: 2, name: "Nutrition Intelligence", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/nutrition-intelligence")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: NutritionIntelligencePage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

function NutritionIntelligencePage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        Pillar guide
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Nutrition Intelligence: the AI Nutrition Intelligence Platform
      </h1>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">
        Nutrition intelligence is the ability to translate what you eat into
        insight you can act on — calories, macros, micronutrients, patterns and
        habits. SmartyDiet packages that intelligence into an AI-powered
        platform that plays the role of your pocket dietitian, nutrition
        consultant, and diet coach.
      </p>

      <Section title="What is nutrition intelligence?">
        <p>
          Nutrition intelligence is the layer of understanding above raw
          tracking. A calorie counter tells you a number. A nutrition
          intelligence platform tells you what that number <em>means</em> for
          your goal, your body, and your habits — and what to change next.
        </p>
        <p>
          SmartyDiet combines classical dietetics (Mifflin-St Jeor BMR, TDEE,
          macro splits, portion logic) with modern AI reasoning to score your
          diet, personalize your plan, and adapt as your goals change.
        </p>
      </Section>

      <Section title="Why it matters">
        <p>
          Generic advice fails because bodies, goals and lifestyles are not
          generic. A 65 kg endurance runner following a Mediterranean pattern
          needs a different plan than a 90 kg lifter in a cutting phase, even
          if they weigh the same in the morning.
        </p>
        <p>
          Nutrition intelligence closes that gap: it turns your assessment into
          a plan that respects your allergies, food preferences, culture,
          budget and schedule.
        </p>
      </Section>

      <Section title="How the Smarty Nutrition Score™ works">
        <p>
          The <strong>Smarty Nutrition Score™</strong> is a composite score of
          your current diet across four axes: macro balance, micronutrient
          coverage, food quality (whole vs ultra-processed), and behavior
          (portion control, meal timing, hydration).
        </p>
        <p>
          Every plan raises the score you can realistically hit — no crash
          diets, no impossible discipline.
        </p>
      </Section>

      <Section title="What Smarty Metabolic Age™ tells you">
        <p>
          <strong>Smarty Metabolic Age™</strong> estimates the age your
          metabolism is behaving like, based on your BMR, body composition
          inputs, activity level, and dietary patterns. It's a motivating
          summary metric — the aim is a metabolic age below your calendar age.
        </p>
      </Section>

      <Section title="From assessment to personalized meal plan">
        <p>
          You answer a smart questionnaire — body, goals, activity, food
          preferences, allergies, schedule. SmartyDiet uses the{" "}
          <strong>Smarty Calorie Engine™</strong> and{" "}
          <strong>Smarty Macro Index™</strong> to build a{" "}
          <strong>Smarty Meal Plan™</strong> with calories, macros, portions
          and a weekly grocery list.
        </p>
        <p>
          You get 2 refinements included, so the first plan is a starting
          point, not a final verdict.
        </p>
      </Section>

      <Section title="Macros, calories and micronutrients">
        <p>
          Calories decide weight direction. Macros — protein, carbs, fats —
          decide body composition and performance. Micronutrients decide how
          you <em>feel</em>. A good plan pays attention to all three.
        </p>
        <ul className="list-disc pl-5">
          <li>Protein is prioritized to protect lean mass during a deficit.</li>
          <li>Carbs are timed around activity where it matters.</li>
          <li>Fats keep hormones and satiety in a healthy range.</li>
          <li>Fiber, water and micronutrients are tracked as guardrails.</li>
        </ul>
      </Section>

      <Section title="Who nutrition intelligence is for">
        <p>
          People losing weight, people gaining muscle, people managing
          conditions like insulin resistance or high blood pressure, and people
          who simply want to eat better without a subscription trap.
        </p>
      </Section>

      <Section title="Deeper topics">
        <ul className="list-disc pl-5">
          <li>
            <Link to="/glossary" className="text-primary font-semibold hover:underline">
              Glossary of nutrition terms
            </Link>{" "}
            — every metric and concept, defined.
          </li>
          <li>
            <Link to="/research" className="text-primary font-semibold hover:underline">
              Research digest
            </Link>{" "}
            — the evidence behind the platform.
          </li>
          <li>
            <Link to="/tools" className="text-primary font-semibold hover:underline">
              Free tools
            </Link>{" "}
            — BMR, macros, calorie counter.
          </li>
        </ul>
      </Section>
    </article>
  );
}
