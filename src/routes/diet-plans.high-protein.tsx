import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding, buildSeoHead, type SeoFaq } from "@/components/seo/SeoLanding";

const FAQS: SeoFaq[] = [
  {
    q: "How much protein should I eat per day?",
    a: "Sedentary adults need at least 0.8 g per kilogram of body weight. Active adults, people losing weight and people over 60 do better on 1.6-2.2 g per kilogram per day. For a 70 kg person that is roughly 112-154 g of protein daily.",
  },
  {
    q: "Is a high protein diet safe?",
    a: "In healthy people, protein intakes in the 1.6-2.2 g/kg range have not been shown to harm kidney or bone health. Anyone with existing kidney disease should follow the intake prescribed by their doctor.",
  },
  {
    q: "What are the best high protein foods?",
    a: "Per 100 g cooked: chicken breast ~31 g, lean beef ~26 g, tuna ~29 g, salmon ~21 g, prawns ~24 g, Greek yogurt ~10 g, cottage cheese ~11 g, eggs ~13 g, tofu ~8 g, tempeh ~19 g, lentils ~9 g, chickpeas ~9 g, quinoa ~4 g.",
  },
  {
    q: "Can I get enough protein on a vegetarian or vegan diet?",
    a: "Yes, but it takes planning. Combine legumes, soy foods (tofu, tempeh, edamame, soy milk), seitan, nuts, seeds and whole grains across the day, and expect to eat slightly more total protein since plant sources are lower in leucine and less digestible.",
  },
  {
    q: "Do I need protein powder?",
    a: "No. Powder is convenience, not necessity. It helps when a target is hard to hit from meals alone, especially on a plant-based diet or during travel.",
  },
];

export const Route = createFileRoute("/diet-plans/high-protein")({
  head: () =>
    buildSeoHead({
      path: "/diet-plans/high-protein",
      title: "High Protein Meal Plans — Protein Targets & Food List | SmartyDiet",
      description:
        "How much protein you need, where to get it, and how a personalized high protein meal plan is built around your calories, goal and food preferences.",
      keywords:
        "high protein meal plan, high protein diet, protein intake, how much protein should I eat, protein calculator, best high protein foods, vegetarian protein sources, vegan protein",
      headline: "High protein meal plans and protein intake targets",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Diet Plans", path: "/diet-plans" },
        { name: "High Protein", path: "/diet-plans/high-protein" },
      ],
      faqs: FAQS,
    }),
  component: HighProteinPage,
});

function HighProteinPage() {
  return (
    <SeoLanding
      eyebrow="High protein"
      h1={
        <>
          High protein <span className="text-primary">meal plans</span>
        </>
      }
      intro="Protein is the macronutrient that decides whether you keep muscle while losing fat and whether you build it while training. Here is how much you need and how SmartyDiet plans it into real meals."
      sections={[
        {
          heading: "Your daily protein target in grams",
          body: "Protein needs scale with body weight and activity, not with calories. Sedentary adults: 0.8-1.2 g/kg. Active adults and anyone in a calorie deficit: 1.6-2.2 g/kg. Older adults benefit from the upper end because the muscle-building response to protein blunts with age. A 60 kg woman training three times a week lands near 96-132 g per day; a 90 kg lifter near 144-198 g.",
        },
        {
          heading: "Protein per meal beats protein per day alone",
          body: "Muscle protein synthesis responds to each feeding, so 4 meals of 35 g outperform one meal of 140 g. Aim for 25-40 g per meal across 3-5 meals, and include a protein source in breakfast — the meal where most people fall short.",
        },
        {
          heading: "High protein food list",
          body: "Approximate protein per 100 g of cooked or ready-to-eat food, useful for building meals without a calculator.",
          bullets: [
            "Poultry and meat: chicken breast 31 g, turkey 29 g, lean beef steak 26 g, pork loin 27 g",
            "Fish and seafood: tuna 29 g, prawns 24 g, cod 23 g, salmon 21 g, sardines 25 g",
            "Eggs and dairy: eggs 13 g, cottage cheese 11 g, Greek yogurt 10 g, halloumi 22 g, feta 14 g",
            "Plant proteins: seitan 25 g, tempeh 19 g, edamame 11 g, tofu 8 g, lentils 9 g, chickpeas 9 g, black beans 9 g",
            "Grains, nuts and seeds: oats 13 g dry, quinoa 4 g cooked, peanuts 26 g, almonds 21 g, pumpkin seeds 19 g, chia seeds 17 g",
          ],
        },
        {
          heading: "High protein without a boring diet",
          body: "The failure mode of high-protein eating is monotony: chicken, rice, broccoli, repeat. A personalized plan rotates protein sources, applies your cuisine preference — Mediterranean, Middle Eastern, Asian, Greek, Italian — and respects your cooking time so the target is hit by food you want to eat.",
        },
        {
          heading: "Fiber, hydration and balance",
          body: "Raising protein should not crowd out vegetables, fruit and whole grains. Keep fiber at 25-38 g per day and drink to thirst plus a little more when training; both make a high-protein diet comfortable rather than heavy.",
        },
      ]}
      faqs={FAQS}
      related={[
        {
          to: "/diet-plans",
          label: "All personalized diet plans",
          description: "How custom meal planning works at SmartyDiet.",
        },
        {
          to: "/diet-plans/muscle-gain",
          label: "Muscle gain diet plans",
          description: "Surplus, protein and training fuel.",
        },
        {
          to: "/diet-plans/weight-loss",
          label: "Weight loss meal plans",
          description: "Protein-led fat loss with a manageable deficit.",
        },
        {
          to: "/tools/calorie-counter",
          label: "Calorie & protein lookup",
          description: "Search foods in USDA FoodData Central.",
        },
        {
          to: "/tools/macro-calculator",
          label: "Macro calculator",
          description: "Set protein, carbs and fats for your goal.",
        },
        {
          to: "/glossary",
          label: "Nutrition glossary",
          description: "Plain definitions of the terms used in your plan.",
        },
      ]}
    />
  );
}
