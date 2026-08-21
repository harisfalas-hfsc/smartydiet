import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Compass } from "lucide-react";
import { SmartyCard, SmartyRow, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";

const URL = "https://smartydiet.com/glossary";
const TITLE = "Nutrition Glossary — 25+ diet & nutrition terms | SmartyDiet";
const DESCRIPTION =
  "Definitions of every nutrition, diet and metabolism term SmartyDiet uses — from BMR and TDEE to Smarty Nutrition Score™ and Smarty Metabolic Age™.";

const TERMS: { term: string; def: string }[] = [
  {
    term: "Smarty Nutrition Score™",
    def: "A composite 0–100 score of a user's current diet across macro balance, micronutrient coverage, food quality, and eating behavior.",
  },
  {
    term: "Smarty Metabolic Age™",
    def: "An estimate of the age a user's metabolism is behaving like, derived from BMR, body composition, activity, and dietary patterns.",
  },
  {
    term: "Smarty Macro Index™",
    def: "How closely a user's actual protein, carb and fat intake matches the optimal split for their body and goal.",
  },
  {
    term: "Smarty Nutrition Intelligence™",
    def: "The AI engine that combines assessment, scoring, personalization and adaptive coaching across the SmartyDiet platform.",
  },
  {
    term: "BMI (Body Mass Index)",
    def: "Weight in kilograms divided by height in meters squared. A population-level screening metric, not a diagnosis.",
  },
  {
    term: "BMR (Basal Metabolic Rate)",
    def: "Calories the body burns at complete rest to keep vital functions running. SmartyDiet uses the Mifflin-St Jeor equation.",
  },
  {
    term: "TDEE (Total Daily Energy Expenditure)",
    def: "BMR multiplied by an activity factor — total calories burned per day including movement and exercise.",
  },
  {
    term: "Macronutrients",
    def: "Protein, carbohydrates and fats — the energy-providing nutrients measured in grams and calories.",
  },
  {
    term: "Micronutrients",
    def: "Vitamins and minerals required in small amounts for enzyme function, immunity, bone health and energy metabolism.",
  },
  {
    term: "Calorie Deficit",
    def: "Eating fewer calories than TDEE. Sustained deficit is the physiological driver of fat loss.",
  },
  {
    term: "Calorie Surplus",
    def: "Eating more calories than TDEE. Required alongside resistance training for meaningful muscle gain.",
  },
  {
    term: "Maintenance Calories",
    def: "Calorie intake equal to TDEE, holding body weight stable over time.",
  },
  {
    term: "Glycemic Index",
    def: "A ranking of carbohydrate foods by how quickly they raise blood glucose relative to pure glucose.",
  },
  {
    term: "Protein Timing",
    def: "Distributing protein across the day (typically 3–5 meals of 20–40 g) to maximize muscle protein synthesis.",
  },
  {
    term: "Meal Frequency",
    def: "The number of eating occasions per day. Total intake matters most; frequency is a preference and adherence lever.",
  },
  {
    term: "Intermittent Fasting",
    def: "Time-restricted eating patterns such as 16:8 or 5:2 that compress daily calorie intake into a shorter window.",
  },
  {
    term: "Mediterranean Diet",
    def: "An eating pattern rich in vegetables, legumes, whole grains, olive oil, fish and moderate dairy, with limited red meat.",
  },
  {
    term: "Ketogenic Diet",
    def: "A very-low-carb, high-fat pattern that shifts primary fuel from glucose to ketone bodies.",
  },
  {
    term: "Nutrient Density",
    def: "The amount of beneficial nutrients per calorie of food. Vegetables, fish and legumes are examples of high nutrient density.",
  },
  {
    term: "Whole Foods",
    def: "Foods eaten close to their natural state, with minimal industrial processing.",
  },
  {
    term: "Ultra-Processed Foods",
    def: "Industrial formulations combining refined ingredients and additives — typically high in calories and low in nutrient density.",
  },
  {
    term: "Fiber",
    def: "Indigestible plant carbohydrate that supports satiety, glucose control and gut microbiome health.",
  },
  {
    term: "Hydration",
    def: "Adequate daily fluid intake to support circulation, temperature regulation and cognitive function.",
  },
  {
    term: "Portion Control",
    def: "Managing serving sizes so total intake matches calorie targets without needing to eliminate food groups.",
  },
  {
    term: "Mindful Eating",
    def: "Eating with attention to hunger, fullness and food quality, reducing distraction-driven overconsumption.",
  },
  {
    term: "Metabolic Flexibility",
    def: "The body's ability to switch between using fats and carbohydrates as fuel based on availability and demand.",
  },
];

const EXPLORE: { to: string; label: string; description: string; icon: string }[] = [
  {
    to: "/diet-plans",
    label: "Personalized diet plans",
    description: "What a custom meal plan includes and how it is calculated.",
    icon: "📋",
  },
  {
    to: "/diet-plans/weight-loss",
    label: "Weight loss meal plans",
    description: "Calorie deficit, protein and hunger control for fat loss.",
    icon: "⚖️",
  },
  {
    to: "/diet-plans/muscle-gain",
    label: "Muscle gain diet plans",
    description: "Calorie surplus, protein distribution and training fuel.",
    icon: "💪",
  },
  {
    to: "/diet-plans/high-protein",
    label: "High protein meal plans",
    description: "How much protein you need and where to get it.",
    icon: "🥩",
  },
  {
    to: "/meal-planning",
    label: "Meal planning guide",
    description: "Plan a week of meals, prep smart and shop once.",
    icon: "🗓️",
  },
  {
    to: "/sports-nutrition",
    label: "Sports nutrition",
    description: "Pre-workout, post-workout and meal timing for training.",
    icon: "🏃",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "DefinedTermSet",
      "@id": `${URL}#terms`,
      name: "SmartyDiet Nutrition Glossary",
      hasDefinedTerm: TERMS.map((t) => ({
        "@type": "DefinedTerm",
        name: t.term,
        description: t.def,
        inDefinedTermSet: `${URL}#terms`,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartydiet.com/" },
        { "@type": "ListItem", position: 2, name: "Glossary", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: GlossaryPage,
});

function GlossaryPage() {
  const cyan = toneClasses("cyan");
  const green = toneClasses("green");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Resources</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Nutrition <span className="text-primary">Glossary</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every metric, diet pattern and concept SmartyDiet uses, defined in plain language.
        </p>
      </div>

      <SmartyCard
        tone="green"
        eyebrow="Personalized nutrition, built around you"
        eyebrowIcon="🍏"
        cornerIcon={Compass}
        title="How SmartyDiet"
        accent="works."
        description="SmartyDiet is an online diet planner that turns a short questionnaire into a personalized diet plan: daily calories from BMR and TDEE, protein, carbohydrate and fat targets, a meal-by-meal menu for 1, 2 or 4 weeks, and a weekly grocery list. Plans respect your goal — weight loss, muscle gain, body recomposition or maintenance — along with allergies, disliked foods, budget, cooking time and eating pattern, including balanced, Mediterranean, high-protein, low-carb, keto, vegetarian and vegan."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-2xl border p-4 no-underline transition-colors hover:border-emerald-400",
                green.softBorder,
                green.softBg,
              )}
              style={{ textDecoration: "none" }}
            >
              <SmartyRow tone="green" icon={l.icon} title={l.label} subtitle={l.description} />
            </Link>
          ))}
        </div>
      </SmartyCard>

      <div className="mt-8">
        <SmartyCard
          tone="cyan"
          eyebrow={`${TERMS.length} terms defined`}
          eyebrowIcon="📖"
          cornerIcon={BookOpen}
          title="Nutrition terms,"
          accent="explained."
          description="From BMR and TDEE to the Smarty metrics behind your plan."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            {TERMS.map((t) => (
              <div
                key={t.term}
                className={cn("rounded-2xl border p-4", cyan.softBorder, cyan.softBg)}
              >
                <dt className="text-sm font-bold text-foreground">{t.term}</dt>
                <dd className="mt-1 text-xs leading-5 text-muted-foreground">{t.def}</dd>
              </div>
            ))}
          </dl>
        </SmartyCard>
      </div>
    </div>
  );
}
