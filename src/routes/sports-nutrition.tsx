import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding, buildSeoHead, type SeoFaq } from "@/components/seo/SeoLanding";

const FAQS: SeoFaq[] = [
  {
    q: "What should I eat before training?",
    a: "A meal with carbohydrate and protein and low fat and fiber, 1-3 hours before the session — for example oats with yogurt and banana, or rice with chicken. If you only have 30-60 minutes, keep it small and mostly carbohydrate: a banana, dates, or a slice of toast with honey.",
  },
  {
    q: "What should I eat after training?",
    a: "A normal meal containing 25-40 g of protein and a carbohydrate source to restore glycogen. Chicken with rice and vegetables, salmon with potatoes, or Greek yogurt with oats and fruit all work. Speed matters far less than total daily intake.",
  },
  {
    q: "How does meal timing affect training?",
    a: "Timing mainly influences how you feel and perform in the session and how quickly you refuel. Placing carbohydrate before and after training improves training quality; total daily calories and protein still determine body composition.",
  },
  {
    q: "How much carbohydrate do athletes need?",
    a: "Roughly 3-5 g per kilogram of body weight per day for general training, 5-7 g/kg for one hour of daily endurance work, and 6-10 g/kg for heavy endurance loads.",
  },
  {
    q: "How much should athletes drink?",
    a: "Drink to thirst across the day and replace roughly 1.25-1.5 litres for every kilogram of body weight lost during a session. Add sodium when sessions are long, hot or heavily sweaty.",
  },
];

export const Route = createFileRoute("/sports-nutrition")({
  head: () =>
    buildSeoHead({
      path: "/sports-nutrition",
      title: "Sports Nutrition — Nutrition for Training & Athletes | SmartyDiet",
      description:
        "Sports nutrition made practical: pre-workout and post-workout meals, meal timing, carbohydrate and protein needs, hydration and recovery — built into a personalized plan.",
      keywords:
        "sports nutrition, nutrition for training, nutrition for athletes, pre workout nutrition, post workout nutrition, meal timing, diet plan for athletes, recovery nutrition, carbohydrate intake, hydration",
      headline: "Sports nutrition and nutrition for training",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Sports Nutrition", path: "/sports-nutrition" },
      ],
      faqs: FAQS,
    }),
  component: SportsNutritionPage,
});

function SportsNutritionPage() {
  return (
    <SeoLanding
      eyebrow="Sports nutrition"
      h1={
        <>
          Sports <span className="text-primary">nutrition</span>
        </>
      }
      intro="Training creates the stimulus; nutrition decides how much of it you keep. Here is what to eat around sessions, and how SmartyDiet plans it for your schedule."
      sections={[
        {
          heading: "Energy availability comes first",
          body: "Before timing, tactics or supplements, athletes need enough total energy. Chronic under-eating lowers training quality, hormonal function, bone health and recovery. Start from TDEE that includes your actual training load, not a generic activity guess, and only then apply a deficit or surplus for your goal.",
        },
        {
          heading: "Pre-workout nutrition",
          body: "The pre-session meal is about available fuel and a comfortable stomach. Carbohydrate-led, moderate protein, low fat and low fiber close to the session.",
          bullets: [
            "2-3 hours before: rice or pasta with chicken or fish and a light vegetable portion",
            "1-2 hours before: oats with Greek yogurt and banana, or toast with eggs",
            "30-60 minutes before: banana, dates, a rice cake with honey, or a small fruit smoothie",
            "Avoid heavy fat and large fiber loads immediately before hard sessions",
          ],
        },
        {
          heading: "Post-workout nutrition and recovery",
          body: "Recovery needs protein for repair and carbohydrate for glycogen. Target 25-40 g of protein in the meal after training and match carbohydrate to how depleting the session was. For twice-daily training or endurance blocks, refuel promptly with 1.0-1.2 g of carbohydrate per kilogram in the first hour; for a single daily session, the next normal meal is enough.",
        },
        {
          heading: "Carbohydrate, protein and fat for training",
          body: "Protein 1.6-2.2 g/kg per day across 3-5 feedings. Carbohydrate 3-10 g/kg depending on training volume and type. Fat 0.6-1.0 g/kg minimum for hormones and vitamin absorption. Endurance athletes sit at the higher end of carbohydrate; strength athletes prioritise protein distribution and training-day carbohydrate.",
        },
        {
          heading: "Hydration, sodium and micronutrients",
          body: "Fluid losses of more than 2% of body weight measurably reduce performance. Drink across the day, add sodium for long or hot sessions, and pay attention to iron (especially female endurance athletes), vitamin D, calcium and omega-3 intake. Blood work, not guesswork, should drive any supplementation.",
        },
        {
          heading: "How SmartyDiet builds nutrition around your training",
          body: "The questionnaire captures training frequency and activity level, so the calorie target reflects real energy expenditure and the plan places larger, carbohydrate-rich meals around your sessions while keeping protein evenly distributed across the day.",
        },
      ]}
      faqs={FAQS}
      related={[
        {
          to: "/diet-plans/muscle-gain",
          label: "Muscle gain diet plans",
          description: "Surplus, protein and training fuel.",
        },
        {
          to: "/diet-plans/high-protein",
          label: "High protein meal plans",
          description: "Daily protein targets and food sources.",
        },
        {
          to: "/meal-planning",
          label: "Meal planning guide",
          description: "Plan meals around training days.",
        },
        {
          to: "/tools/bmr-calculator",
          label: "BMR & TDEE calculator",
          description: "Energy needs including training load.",
        },
        {
          to: "/diet-science",
          label: "The Diet Science",
          description: "Evidence behind macros and diet schedules.",
        },
        {
          to: "/diet-plans",
          label: "Personalized diet plans",
          description: "Get the whole thing built for you.",
        },
      ]}
    />
  );
}
