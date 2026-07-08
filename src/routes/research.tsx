import { createFileRoute } from "@tanstack/react-router";

const URL = "https://smartydiet.com/research";
const TITLE = "Nutrition Research Digest — the science behind SmartyDiet";
const DESCRIPTION =
  "Plain-language summaries of the nutrition science powering SmartyDiet: calorie balance, protein, Mediterranean diet, intermittent fasting, glycemic index, micronutrients, habits and AI personalization.";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Calorie balance and weight regulation",
    body: "Sustained differences between energy intake and energy expenditure drive changes in body weight. The magnitude of the deficit or surplus, not the exact diet name, is the primary lever.",
  },
  {
    title: "Protein intake and body composition",
    body: "Higher protein intakes (roughly 1.6–2.2 g per kg of body weight per day) support lean-mass retention during weight loss and muscle gain during a surplus, especially when combined with resistance training.",
  },
  {
    title: "Mediterranean diet and long-term health",
    body: "The Mediterranean pattern — vegetables, legumes, whole grains, olive oil, fish, moderate dairy, limited red meat — is consistently associated with lower cardiovascular risk and improved metabolic markers in long-term cohort and interventional studies.",
  },
  {
    title: "Intermittent fasting evidence",
    body: "Time-restricted eating and periodic fasting can be effective adherence strategies. Their weight-loss effect is largely explained by reduced total calorie intake rather than a unique metabolic advantage.",
  },
  {
    title: "Glycemic index and metabolic health",
    body: "Lower-glycemic carbohydrate choices (legumes, intact whole grains, most fruits) tend to blunt post-meal glucose and insulin spikes, which can support appetite control and metabolic markers, particularly in insulin-resistant populations.",
  },
  {
    title: "Micronutrient density",
    body: "Populations that consume more nutrient-dense whole foods have lower risks of deficiency-related conditions. Vegetables, fish, legumes, eggs, dairy and organ meats are among the most consistently nutrient-dense foods.",
  },
  {
    title: "Behavior change and habit formation",
    body: "Sustainable change comes from small, repeatable habits — planning meals, keeping high-protein staples available, sleeping enough, and reducing friction — rather than short bursts of willpower.",
  },
  {
    title: "AI-personalized nutrition",
    body: "Personalized approaches that respect individual physiology, preferences, and constraints consistently outperform one-size-fits-all diets on adherence, which is the strongest predictor of long-term outcomes. SmartyDiet applies this evidence through its Smarty Nutrition Intelligence™ engine.",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${URL}#collection`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": "https://smartydiet.com/#website" },
      hasPart: SECTIONS.map((s) => ({
        "@type": "CreativeWork",
        name: s.title,
        abstract: s.body,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartydiet.com/" },
        { "@type": "ListItem", position: 2, name: "Research", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        Research digest
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        The science behind SmartyDiet
      </h1>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">
        Plain-language summaries of the nutrition evidence that powers our
        assessments, scores and personalized plans.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{s.title}</h2>
            <p className="mt-2 text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        SmartyDiet is a general wellness tool, not medical advice. See our
        Disclaimer for details.
      </p>
    </article>
  );
}
