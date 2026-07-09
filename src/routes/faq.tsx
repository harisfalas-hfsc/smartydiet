import { createFileRoute } from "@tanstack/react-router";


const URL = "https://smartydiet.com/faq";
const TITLE =
  "SmartyDiet FAQ — AI Nutrition Intelligence Platform, pricing, privacy & accuracy";
const DESCRIPTION =
  "Answers to common questions about SmartyDiet: what nutrition intelligence is, how the Smarty Nutrition Score™ and Smarty Metabolic Age™ work, pricing, privacy and accuracy.";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "What is SmartyDiet?",
    a: "SmartyDiet is an AI Nutrition Intelligence Platform — a pocket dietitian, nutrition consultant and diet coach in one app. It turns a smart questionnaire into a fully personalized diet plan with calories, macros, portions and a weekly grocery list, plus free tools like BMR, TDEE, macro and calorie calculators.",
  },
  {
    q: "What is nutrition intelligence?",
    a: "Nutrition intelligence is the ability to translate what you eat into actionable insight — calories, macros, micronutrients, patterns and habits. SmartyDiet packages that layer of intelligence into an AI-powered platform, so you get a personalized plan rather than just a tracker.",
  },
  {
    q: "How does SmartyDiet calculate the Smarty Nutrition Score™?",
    a: "The Smarty Nutrition Score™ is a composite 0–100 score of your current diet across four axes: macro balance, micronutrient coverage, food quality (whole vs ultra-processed) and behavior (portion control, meal timing, hydration).",
  },
  {
    q: "What is Smarty Metabolic Age™?",
    a: "Smarty Metabolic Age™ estimates the age your metabolism is behaving like, derived from BMR, body composition inputs, activity level and dietary patterns. It is a motivating summary metric — the aim is a metabolic age below your calendar age.",
  },
  {
    q: "How is SmartyDiet different from generic calorie trackers?",
    a: "A calorie tracker gives you a number. SmartyDiet gives you a plan. It assesses your body, goals, allergies, food preferences and schedule, then generates a personalized Smarty Meal Plan™ with portions and a grocery list, and coaches you toward a higher Smarty Nutrition Score™.",
  },
  {
    q: "How is SmartyDiet different from a human dietitian?",
    a: "A human dietitian can diagnose and treat medical conditions; SmartyDiet cannot. What SmartyDiet does do is package the assessment, calculation and planning work of a dietitian into an always-available AI, at a one-time price of $4.99 instead of a per-session fee.",
  },
  {
    q: "How does the AI meal planner work?",
    a: "You answer a smart questionnaire (body, goals, activity, food preferences, allergies, schedule). The Smarty Calorie Engine™ computes your calorie and macro targets, and the AI builds a Smarty Meal Plan™ that respects every constraint you entered. You get 2 refinements included.",
  },
  {
    q: "How accurate are the calorie, BMI, BMR and macro calculators?",
    a: "SmartyDiet uses the Mifflin-St Jeor equation for BMR and standard activity multipliers for TDEE — the same methods used by dietitians. Any equation is an estimate; biology varies. Treat the numbers as a strong starting point and adjust based on how you feel and respond.",
  },
  {
    q: "How often should I update my meal plan?",
    a: "Most users benefit from revisiting their plan every 4–8 weeks or after any meaningful change (new goal, new activity level, weight change of a few kilograms, or a new schedule).",
  },
  {
    q: "How much does it cost?",
    a: "$4.99 as a one-time payment. That includes your initial personalized plan and 2 refinement credits (3 AI generations in total). There is no subscription.",
  },
  {
    q: "Is SmartyDiet medical advice?",
    a: "No. SmartyDiet is a general wellness tool. It is not medical advice, and it is not a substitute for a doctor, registered dietitian or other qualified healthcare professional. If you have a medical condition, are pregnant/breastfeeding, or take medication that affects diet, consult a professional before starting any plan.",
  },
  {
    q: "What if I have allergies?",
    a: "Allergies are a required field and the AI is explicitly instructed to exclude every allergen you list. Please be thorough — the plan is only as safe as what you tell us.",
  },
  {
    q: "Can I get a refund?",
    a: "If the plan generation fails for a technical reason and we cannot deliver a plan, contact us for a full refund. Because plans are personalized digital content delivered immediately, refunds are otherwise not guaranteed.",
  },
  {
    q: "What do you do with my data?",
    a: "Your questionnaire and plan are stored in your SmartyDiet account so you can access them anytime. We do not sell your data. See our Privacy Policy for full details.",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      "@id": `${URL}#faq`,
      mainEntity: ITEMS.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "h2", "p"],
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartydiet.com/" },
        { "@type": "ListItem", position: 2, name: "FAQ", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: FAQ,
});

import { SmartyCard } from "@/components/SmartyCard";

const TONES: Array<
  "cyan" | "green" | "orange" | "purple" | "yellow" | "pink" | "blue"
> = ["cyan", "green", "orange", "purple", "yellow", "pink", "blue"];
const EMOJIS = ["💡", "🧠", "📊", "⚙️", "🍽️", "🩺", "🤖", "📐", "🔁", "💳", "🩹", "⚠️", "↩️", "🔒"];

function FAQ() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">FAQ</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your <span className="text-primary">questions</span>, answered
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          The answers we get most often. Still unsure? Reach out via the footer.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it, i) => (
          <SmartyCard
            key={i}
            tone={TONES[i % TONES.length]}
            eyebrow={`Q${String(i + 1).padStart(2, "0")}`}
            eyebrowIcon={EMOJIS[i % EMOJIS.length]}
            title={it.q}
          >
            <p className="text-sm text-muted-foreground">{it.a}</p>
          </SmartyCard>
        ))}
      </div>
    </div>
  );
}

