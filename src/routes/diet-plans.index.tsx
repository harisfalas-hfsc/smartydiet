import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding, buildSeoHead, type SeoFaq } from "@/components/seo/SeoLanding";

const FAQS: SeoFaq[] = [
  {
    q: "How do I create a personalized diet plan?",
    a: "Answer the SmartyDiet questionnaire — age, sex, height, weight, activity level, goal, food preferences, allergies, budget, cooking time and how many meals a day you want. SmartyDiet estimates your BMR with the Mifflin-St Jeor equation, converts it to TDEE using your activity level, applies a calorie deficit or surplus for your goal, splits the result into protein, carbohydrate and fat targets, and then builds a meal-by-meal plan with a grocery list.",
  },
  {
    q: "What is the difference between a personalized diet plan and a generic meal plan?",
    a: "A generic meal plan gives everybody the same menu at the same calorie level. A personalized diet plan starts from your own body data, goal and constraints, so the calories, macros, portion sizes, foods and meal frequency are calculated for you and exclude anything you can't or won't eat.",
  },
  {
    q: "How many calories do I need each day?",
    a: "Daily calorie needs are your basal metabolic rate multiplied by an activity factor (roughly 1.2 for sedentary up to 1.9 for very active), then adjusted for your goal. Fat loss usually means 10-20% below maintenance; muscle gain usually means 5-15% above. You can estimate yours with the free BMR and macro calculators.",
  },
  {
    q: "Do I need to count calories forever?",
    a: "No. Most people use a structured plan to learn portion sizes, protein targets and meal patterns, then eat more intuitively once those habits are automatic. The plan is a teaching tool as much as a menu.",
  },
  {
    q: "Which dietary preferences are supported?",
    a: "SmartyDiet builds plans around balanced, Mediterranean, high-protein, low-carb and keto, vegetarian and vegan patterns, and respects declared allergies and disliked foods.",
  },
];

export const Route = createFileRoute("/diet-plans/")({
  head: () =>
    buildSeoHead({
      path: "/diet-plans",
      title: "Personalized Diet Plans Online — Custom Meal Plans | SmartyDiet",
      description:
        "Build a personalized diet plan online: custom meal plans based on your calories, macros, goals, food preferences and allergies. Weight loss, muscle gain, high-protein and balanced plans.",
      keywords:
        "personalized diet plan, custom diet plan, custom meal plan, online diet planner, personal nutrition plan, meal planner, diet plan generator, calorie based meal plan, macro based meal plan, healthy meal plan",
      headline: "Personalized diet plans and custom meal plans",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Diet Plans", path: "/diet-plans" },
      ],
      faqs: FAQS,
    }),
  component: DietPlansHub,
});

function DietPlansHub() {
  return (
    <SeoLanding
      eyebrow="Diet plans"
      h1={
        <>
          Personalized <span className="text-primary">diet plans</span>
        </>
      }
      intro="SmartyDiet turns your body data, goals and food preferences into a custom meal plan with calories, macros, recipes and a weekly grocery list — built in minutes, not weeks."
      sections={[
        {
          heading: "What a personalized diet plan from SmartyDiet includes",
          body: "Every plan is generated for one person only: you. Instead of a downloadable PDF written for an average adult, you get a menu calculated from your own energy needs and built around food you actually eat.",
          bullets: [
            "Daily calorie target derived from your BMR and TDEE",
            "Protein, carbohydrate and fat targets in grams, plus fiber and water",
            "A meal-by-meal plan for 1 or 2 weeks with the number of meals per day you chose",
            "A consolidated weekly grocery list so shopping takes one trip",
            "Allergy and dislike exclusions applied to every single meal",
            "PDF export so you can print the plan or take it to the kitchen",
          ],
        },
        {
          heading: "How the personalization actually works",
          body: "The questionnaire collects the variables that genuinely change a nutrition prescription. Basal metabolic rate is estimated with the Mifflin-St Jeor equation, then multiplied by an activity factor to give total daily energy expenditure. Your goal shifts that number into a deficit or a surplus. Protein is set first — typically 1.6-2.2 g per kilogram of body weight for active people — then fats are set to a hormonally safe minimum, and carbohydrates fill the remaining calories. Only after the numbers are fixed does the plan choose foods, and it chooses them from what you said you like, can afford and have time to cook.",
        },
        {
          heading: "Choose the plan type that matches your goal",
          body: "Different goals need different calorie balances, protein levels and meal timing. Start from the guide that matches what you are trying to do, then build the plan.",
          bullets: [
            "Weight loss: a moderate calorie deficit with high protein and high fiber to protect muscle and control hunger",
            "Muscle gain: a small calorie surplus, high protein and enough carbohydrate to fuel training",
            "Body recomposition: maintenance calories, very high protein and progressive resistance training",
            "Maintenance and healthy eating: balanced or Mediterranean-style eating at your maintenance calories",
          ],
        },
        {
          heading: "Real food, not supplements",
          body: "Plans are built from ordinary groceries: eggs, chicken, beef, salmon, tuna, Greek yogurt, cottage cheese, lentils, chickpeas, beans, tofu, tempeh, oats, rice, quinoa, potatoes, whole-grain bread and pasta, olive oil, nuts, chia and flax seeds, avocado, spinach, broccoli, tomatoes, peppers, apples, bananas and berries. Nothing in a plan depends on buying a supplement or a branded product.",
        },
        {
          heading: "Free nutrition tools you can use before you commit",
          body: "You do not need an account to run the numbers. The BMR calculator estimates your resting energy needs, the macro calculator turns your goal into protein, carbohydrate and fat targets, and the calorie counter looks up foods in the USDA FoodData Central database.",
        },
      ]}
      faqs={FAQS}
      related={[
        {
          to: "/diet-plans/weight-loss",
          label: "Weight loss meal plans",
          description: "Calorie deficit, protein targets and hunger control for fat loss.",
        },
        {
          to: "/diet-plans/muscle-gain",
          label: "Muscle gain diet plans",
          description: "Calorie surplus, protein distribution and training fuel.",
        },
        {
          to: "/diet-plans/high-protein",
          label: "High protein meal plans",
          description: "How much protein you need and where to get it.",
        },
        {
          to: "/meal-planning",
          label: "Meal planning guide",
          description: "How to plan a week of meals around calories and macros.",
        },
        {
          to: "/sports-nutrition",
          label: "Sports nutrition",
          description: "Pre-workout, post-workout and meal timing for training.",
        },
        {
          to: "/tools",
          label: "Free nutrition calculators",
          description: "BMR, TDEE, macros and a USDA-powered calorie counter.",
        },
      ]}
    />
  );
}
