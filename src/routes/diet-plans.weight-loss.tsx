import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding, buildSeoHead, type SeoFaq } from "@/components/seo/SeoLanding";

const FAQS: SeoFaq[] = [
  {
    q: "What is a calorie deficit?",
    a: "A calorie deficit means eating fewer calories than your body uses in a day. Body fat is then used to cover the difference. A deficit of roughly 15-20% below maintenance, or about 300-700 kcal per day for most adults, produces steady fat loss of about 0.3-0.7 kg per week.",
  },
  {
    q: "What should I eat to lose weight?",
    a: "Build each meal around a protein source (eggs, chicken, fish, Greek yogurt, tofu, legumes), a large volume of vegetables, a measured portion of a fiber-rich carbohydrate (oats, potatoes, rice, whole grains, fruit) and a small measured portion of fat (olive oil, nuts, avocado). This pattern hits protein and fiber targets, which are the two strongest predictors of appetite control in a deficit.",
  },
  {
    q: "How do I calculate my calories for weight loss?",
    a: "Estimate your BMR with the Mifflin-St Jeor equation, multiply by your activity factor to get TDEE, then subtract 15-20%. The free BMR and macro calculators do both steps for you.",
  },
  {
    q: "How much protein should I eat while losing weight?",
    a: "Higher than at maintenance: around 1.6-2.2 g per kilogram of body weight per day. Protein preserves lean mass in a deficit and is the most satiating macronutrient per calorie.",
  },
  {
    q: "Why has my weight loss stalled?",
    a: "The three usual causes are unlogged calories creeping back in, a lower TDEE after losing weight, and normal water-weight fluctuations masking real fat loss. Judge progress on a weekly average rather than a single morning reading, and recalculate targets after every 4-5 kg lost.",
  },
];

export const Route = createFileRoute("/diet-plans/weight-loss")({
  head: () =>
    buildSeoHead({
      path: "/diet-plans/weight-loss",
      title: "Weight Loss Meal Plans — Personalized Fat Loss Diet | SmartyDiet",
      description:
        "A personalized weight loss meal plan built on your own calorie deficit, protein target and food preferences. Learn how many calories to eat and what to eat to lose fat sustainably.",
      keywords:
        "weight loss meal plan, diet plan for weight loss, fat loss diet, calorie deficit, how to calculate calories for weight loss, slimming diet plan, personalized weight loss plan, healthy eating plan for weight loss",
      headline: "Weight loss meal plans and fat loss nutrition",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Diet Plans", path: "/diet-plans" },
        { name: "Weight Loss", path: "/diet-plans/weight-loss" },
      ],
      faqs: FAQS,
    }),
  component: WeightLossPage,
});

function WeightLossPage() {
  return (
    <SeoLanding
      eyebrow="Weight loss"
      h1={
        <>
          Weight loss <span className="text-primary">meal plans</span>
        </>
      }
      intro="Fat loss is a calorie deficit you can actually live with. SmartyDiet calculates your deficit, sets a protein target that protects muscle, and builds the meals around food you like."
      sections={[
        {
          heading: "Step 1 — find your maintenance calories",
          body: "Your maintenance level is total daily energy expenditure: basal metabolic rate multiplied by an activity factor. A 32-year-old woman, 168 cm, 74 kg, lightly active has a BMR near 1,470 kcal and a TDEE near 2,020 kcal. Fat loss starts by subtracting 15-20% from that number, not by guessing a round figure like 1,200 kcal.",
        },
        {
          heading: "Step 2 — set protein before anything else",
          body: "In a deficit the body will take amino acids from wherever it can, including muscle. A protein intake of 1.6-2.2 g per kilogram of body weight, spread over 3-5 meals, keeps that loss to a minimum and keeps you full. Practical anchors: 150 g chicken breast ≈ 46 g protein, 200 g Greek yogurt ≈ 20 g, three eggs ≈ 19 g, 150 g salmon ≈ 31 g, 100 g lean beef steak ≈ 26 g, 200 g tofu ≈ 16 g, 150 g cooked lentils ≈ 13 g.",
        },
        {
          heading: "Step 3 — use volume and fiber to control hunger",
          body: "High-volume, low-calorie foods make a deficit feel smaller than it is. Aim for 25-38 g of fiber a day from vegetables, legumes, berries and intact whole grains.",
          bullets: [
            "Vegetables at every main meal: spinach, broccoli, courgette, peppers, tomatoes, cucumber, cabbage",
            "Fruit as the default sweet: apples, berries, oranges, kiwi, banana around training",
            "Legumes for fiber and protein together: lentils, chickpeas, black beans",
            "Chia and flax seeds for fiber and omega-3, in yogurt or oats",
            "Water first when hunger appears between planned meals",
          ],
        },
        {
          heading: "Step 4 — keep the deficit sustainable",
          body: "Aggressive deficits fail for behavioural reasons, not metabolic ones. Losing 0.5-1% of body weight per week preserves muscle, training performance and adherence. Plan for social meals inside the weekly calorie budget instead of treating them as failures, and recalculate targets after every 4-5 kg of loss because a lighter body burns fewer calories.",
        },
        {
          heading: "What your SmartyDiet weight loss plan looks like",
          body: "You get the daily calorie and macro targets, a full meal-by-meal menu for 1, 2 or 4 weeks at the meal frequency you chose, portion sizes in grams, a weekly grocery list, and every allergen or disliked food removed. Two refinements are included so the plan can be adjusted once you have real-world feedback.",
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
          to: "/diet-plans/high-protein",
          label: "High protein meal plans",
          description: "Protein targets, sources and distribution.",
        },
        {
          to: "/tools/bmr-calculator",
          label: "BMR & TDEE calculator",
          description: "Estimate maintenance calories in 30 seconds.",
        },
        {
          to: "/tools/macro-calculator",
          label: "Macro calculator",
          description: "Turn your goal into protein, carb and fat targets.",
        },
        {
          to: "/meal-planning",
          label: "Meal planning guide",
          description: "Plan and prep a week of meals without burning out.",
        },
        {
          to: "/diet-science",
          label: "The Diet Science",
          description: "Evidence behind popular diet schedules and macros.",
        },
      ]}
    />
  );
}
