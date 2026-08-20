import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding, buildSeoHead, type SeoFaq } from "@/components/seo/SeoLanding";

const FAQS: SeoFaq[] = [
  {
    q: "How do I create a meal plan?",
    a: "Set your daily calorie target, decide how many meals a day you want, assign a protein source and a vegetable to each meal, add a measured carbohydrate and fat portion, then repeat the structure across the week with two or three rotating options per meal. Write the grocery list from the finished plan, not before it.",
  },
  {
    q: "How do I plan meals for weight loss?",
    a: "Plan protein and vegetables first, then fit the carbohydrate and fat portions into the remaining calories. High-volume, high-fiber meals make a deficit feel manageable, and planning removes the decisions that usually get made badly when you are hungry.",
  },
  {
    q: "How many meals a day should I eat?",
    a: "Total daily calories and protein matter far more than meal count. Three to five meals suits most people; SmartyDiet builds plans for anything from one meal a day to five, because adherence beats theory.",
  },
  {
    q: "How long can I meal prep in advance?",
    a: "Cooked proteins, grains and roasted vegetables keep 3-4 days refrigerated and up to three months frozen. Most people cook twice a week rather than once, which keeps food fresh and avoids day-five fatigue.",
  },
  {
    q: "What is the difference between calories and macros?",
    a: "Calories are the total energy you eat and decide whether you gain, lose or maintain weight. Macros — protein, carbohydrate and fat — describe where those calories come from and decide body composition, satiety and training performance.",
  },
];

export const Route = createFileRoute("/meal-planning")({
  head: () =>
    buildSeoHead({
      path: "/meal-planning",
      title: "Meal Planning Guide — How to Plan a Week of Healthy Meals | SmartyDiet",
      description:
        "A practical meal planning guide: how to build a weekly meal plan around calories and macros, prep efficiently, shop once, and stay consistent without eating the same thing every day.",
      keywords:
        "meal planning, meal planner, how to create a meal plan, weekly meal plan, meal prep, healthy meal planning, grocery list, calorie based meal plan, macro based meal plan, online meal planner",
      headline: "How to plan a week of healthy meals",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Meal Planning", path: "/meal-planning" },
      ],
      faqs: FAQS,
    }),
  component: MealPlanningPage,
});

function MealPlanningPage() {
  return (
    <SeoLanding
      eyebrow="Meal planning"
      h1={
        <>
          Meal <span className="text-primary">planning</span> guide
        </>
      }
      intro="Most diets fail at 6pm on a Tuesday, not in theory. A weekly meal plan removes the decision, the guesswork and the emergency takeaway."
      sections={[
        {
          heading: "The five-step weekly meal plan",
          body: "This is the same sequence SmartyDiet automates, written out so you can follow it manually if you prefer.",
          bullets: [
            "1. Set the daily calorie target from your BMR, activity level and goal",
            "2. Set protein in grams, then fats, then let carbohydrates fill the remainder",
            "3. Choose the number of meals per day and split the calories across them",
            "4. Assign a protein, a vegetable, a carbohydrate and a fat to every meal slot",
            "5. Roll the finished week into a single consolidated grocery list",
          ],
        },
        {
          heading: "Build a meal template, not 21 separate recipes",
          body: "A template is a repeatable structure with interchangeable parts: protein + vegetables + carbohydrate + fat + flavour. Swap chicken for salmon, rice for potatoes, or broccoli for green beans and the calories and macros barely move. Two or three options per meal slot gives enough variety for a week without a new recipe every day.",
        },
        {
          heading: "Meal prep that survives contact with a real week",
          body: "Cook in components rather than in sealed identical boxes. Batch a protein, a grain and a tray of roasted vegetables, then assemble plates in two minutes. Refrigerated cooked food is best used within 3-4 days; freeze anything beyond that. Prepping twice a week — for example Sunday and Wednesday — keeps meals fresh and adherence high.",
        },
        {
          heading: "Shop from the plan, and shop once",
          body: "A grocery list generated from the finished plan removes impulse buys and food waste. Staples that appear on almost every plan: eggs, Greek yogurt, chicken, fish, lentils, oats, rice, potatoes, olive oil, nuts, seeds, frozen vegetables, tomatoes, onions, garlic, lemons, apples and bananas. Frozen produce is nutritionally equivalent to fresh and never spoils mid-week.",
        },
        {
          heading: "Meal timing and eating patterns",
          body: "Meal timing is a secondary lever. It matters most around training and for appetite control. If you train in the evening, place more carbohydrate in the meals before and after the session. If you prefer intermittent fasting, a compressed eating window can work — but protein becomes harder to hit, so plan it first.",
        },
        {
          heading: "Let SmartyDiet do it for you",
          body: "The questionnaire captures your calories, goal, cuisine preference, allergies, budget, cooking time and meal frequency, then produces the full week — menu, portions in grams, macros per meal and the grocery list — as a plan you can export to PDF.",
        },
      ]}
      faqs={FAQS}
      related={[
        {
          to: "/diet-plans",
          label: "Personalized diet plans",
          description: "Custom meal plans built from your own data.",
        },
        {
          to: "/diet-plans/weight-loss",
          label: "Weight loss meal plans",
          description: "Deficit, protein and hunger control.",
        },
        {
          to: "/how-it-works",
          label: "How SmartyDiet works",
          description: "From questionnaire to finished plan.",
        },
        {
          to: "/tools/macro-calculator",
          label: "Macro calculator",
          description: "Calories and macros before you plan.",
        },
        {
          to: "/tools/calorie-counter",
          label: "Calorie counter",
          description: "Check any food while you plan.",
        },
        {
          to: "/sports-nutrition",
          label: "Sports nutrition",
          description: "Planning meals around training days.",
        },
      ]}
    />
  );
}
