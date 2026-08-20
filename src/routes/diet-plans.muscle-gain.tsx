import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding, buildSeoHead, type SeoFaq } from "@/components/seo/SeoLanding";

const FAQS: SeoFaq[] = [
  {
    q: "What is a calorie surplus?",
    a: "A calorie surplus means eating more calories than you burn, giving the body the raw material to build new tissue. For muscle gain a surplus of roughly 5-15% above maintenance — often 200-400 kcal per day — is enough. Larger surpluses mostly add fat.",
  },
  {
    q: "What should I eat to build muscle?",
    a: "Anchor every meal with 25-40 g of high-quality protein, add carbohydrates around training to fuel and refuel sessions, and keep fats at 0.6-1.0 g per kilogram for hormonal health. Eggs, chicken, beef, fish, dairy, tofu, tempeh and legumes with rice, oats, potatoes and fruit cover almost everything.",
  },
  {
    q: "How much protein do I need to gain muscle?",
    a: "About 1.6-2.2 g per kilogram of body weight per day. Intakes above that have not been shown to add muscle faster in trained lifters eating enough total calories.",
  },
  {
    q: "How fast can I gain muscle?",
    a: "Realistically 0.25-0.5% of body weight per week for beginners, and slower for experienced lifters. Faster weight gain than that is mostly fat and water.",
  },
  {
    q: "Do I need to eat protein immediately after training?",
    a: "The so-called anabolic window is much wider than once believed. Total daily protein and a sensible distribution across 3-5 meals matter far more than eating within 30 minutes of finishing a session.",
  },
];

export const Route = createFileRoute("/diet-plans/muscle-gain")({
  head: () =>
    buildSeoHead({
      path: "/diet-plans/muscle-gain",
      title: "Muscle Gain Diet Plans — Bulking & Lean Mass Nutrition | SmartyDiet",
      description:
        "A personalized muscle gain diet plan: calorie surplus, protein distribution and training-day carbohydrates calculated for your body, goal and food preferences.",
      keywords:
        "muscle gain diet plan, muscle building diet, bulking diet, nutrition plan for muscle gain, lean bulk meal plan, high protein diet for muscle, calorie surplus, body recomposition",
      headline: "Muscle gain diet plans and lean mass nutrition",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Diet Plans", path: "/diet-plans" },
        { name: "Muscle Gain", path: "/diet-plans/muscle-gain" },
      ],
      faqs: FAQS,
    }),
  component: MuscleGainPage,
});

function MuscleGainPage() {
  return (
    <SeoLanding
      eyebrow="Muscle gain"
      h1={
        <>
          Muscle gain <span className="text-primary">diet plans</span>
        </>
      }
      intro="Building muscle needs three things from nutrition: enough total calories, enough protein, and enough carbohydrate to train hard. SmartyDiet calculates all three for your body and builds the meals."
      sections={[
        {
          heading: "The calorie surplus that builds muscle, not just weight",
          body: "Start from your maintenance calories (BMR × activity factor) and add roughly 10%. For a 78 kg man training four times a week with a TDEE near 2,850 kcal, that is about 3,100 kcal per day. Track the scale weekly: gaining 0.25-0.5% of body weight per week keeps the ratio of muscle to fat favourable. If the scale climbs faster, trim the surplus rather than adding cardio.",
        },
        {
          heading: "Protein: how much, and how to spread it",
          body: "Aim for 1.6-2.2 g per kilogram per day, divided into 3-5 servings of 25-40 g each. Distribution matters because muscle protein synthesis responds to each protein feeding rather than to a single large dose.",
          bullets: [
            "Breakfast: eggs, Greek yogurt, cottage cheese, milk, oats with whey or soy milk",
            "Lunch and dinner: chicken breast, lean beef steak, turkey, salmon, tuna, white fish, tofu, tempeh, seitan",
            "Plant-based combinations: lentils and rice, chickpeas and couscous, beans and corn",
            "Evening: a slow-digesting protein such as cottage cheese or casein-rich dairy",
          ],
        },
        {
          heading: "Carbohydrates fuel the training that causes growth",
          body: "Carbohydrate refills muscle glycogen, supports training volume and blunts muscle breakdown. Active lifters typically do well on 4-6 g per kilogram per day, concentrated in the meals before and after training. Rice, oats, potatoes, pasta, whole-grain bread, fruit and legumes are the practical staples.",
        },
        {
          heading: "Fats, micronutrients and recovery",
          body: "Keep fats at 0.6-1.0 g per kilogram from olive oil, nuts, seeds, avocado and fatty fish. Do not cut them to make room for more carbohydrate — testosterone and vitamin absorption depend on adequate fat. Sleep, progressive overload and consistent training remain the actual growth stimulus; nutrition permits growth, it does not cause it.",
        },
        {
          heading: "Body recomposition instead of bulking",
          body: "Beginners, people returning after a break and those carrying extra body fat can add muscle at maintenance calories with very high protein. SmartyDiet supports this as a distinct goal: the calories stay level, protein goes to the upper end of the range, and carbohydrates are timed around training.",
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
          to: "/sports-nutrition",
          label: "Sports nutrition",
          description: "Pre-workout, post-workout and meal timing.",
        },
        {
          to: "/diet-plans/high-protein",
          label: "High protein meal plans",
          description: "Protein sources and daily targets in grams.",
        },
        {
          to: "/tools/macro-calculator",
          label: "Macro calculator",
          description: "Protein, carbohydrate and fat targets for your goal.",
        },
        {
          to: "/tools/calorie-counter",
          label: "Calorie counter",
          description: "Look up any food in the USDA database.",
        },
        {
          to: "/diet-plans/weight-loss",
          label: "Weight loss meal plans",
          description: "Cutting after a gaining phase.",
        },
      ]}
    />
  );
}
