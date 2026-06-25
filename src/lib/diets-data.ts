export type CalorieLevel = 1000 | 1250 | 1500 | 1750 | 2000;

export const CALORIE_LEVELS: CalorieLevel[] = [1000, 1250, 1500, 1750, 2000];

export type Diet = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  bestFor: string;
  emoji: string;
};

export const DIETS: Diet[] = [
  {
    slug: "mediterranean",
    name: "Mediterranean",
    tagline: "Olive oil, fish, vegetables and whole grains.",
    description:
      "Inspired by the traditional eating habits of countries bordering the Mediterranean Sea. Rich in vegetables, fruits, legumes, nuts, olive oil and fish.",
    highlights: ["Heart-healthy fats", "Plenty of vegetables", "Moderate fish & poultry", "Low red meat"],
    bestFor: "Long-term health and balanced eating.",
    emoji: "🫒",
  },
  {
    slug: "keto",
    name: "Keto",
    tagline: "Very low carb, high fat — fueled by ketones.",
    description:
      "A high-fat, very low-carb approach that shifts your body into ketosis, using fat as primary fuel.",
    highlights: ["<50g carbs/day", "High healthy fats", "Moderate protein", "Steady energy"],
    bestFor: "Fat loss and stable blood sugar.",
    emoji: "🥑",
  },
  {
    slug: "carnivore",
    name: "Carnivore",
    tagline: "Animal foods only — meat, fish, eggs.",
    description:
      "An all-animal-foods elimination protocol. Removes plants entirely to simplify digestion and isolate triggers.",
    highlights: ["Zero carbs", "High protein & fat", "Elimination protocol", "Simple to follow"],
    bestFor: "Elimination phases and inflammation testing.",
    emoji: "🥩",
  },
  {
    slug: "vegan",
    name: "Vegan",
    tagline: "100% plant-based — no animal products.",
    description:
      "Fully plant-based eating built on vegetables, fruits, legumes, grains, nuts and seeds.",
    highlights: ["No animal products", "High fiber", "Plant proteins", "Ethical & eco-friendly"],
    bestFor: "Plant-forward lifestyle and gut health.",
    emoji: "🥦",
  },
  {
    slug: "vegetarian",
    name: "Vegetarian",
    tagline: "No meat or fish, dairy and eggs allowed.",
    description:
      "Plant-focused but keeps dairy and eggs as flexible protein sources.",
    highlights: ["No meat or fish", "Includes dairy & eggs", "Rich in fiber", "Easy to balance"],
    bestFor: "An accessible plant-based starting point.",
    emoji: "🥚",
  },
  {
    slug: "high-protein",
    name: "High Protein",
    tagline: "Protein-forward meals for muscle and satiety.",
    description:
      "Built around lean protein at every meal to support muscle, recovery and appetite control.",
    highlights: ["1.6–2.2g/kg protein", "Lean meats, fish, dairy", "Supports muscle", "Great for training"],
    bestFor: "Muscle gain, recovery and fat loss with training.",
    emoji: "🍗",
  },
  {
    slug: "intermittent-fasting",
    name: "Intermittent Fasting",
    tagline: "Time-restricted eating windows.",
    description:
      "Eat within a defined window (e.g. 16:8) to simplify calorie control and improve metabolic health.",
    highlights: ["16:8 / 18:6 windows", "Simpler routine", "Fewer meals", "Pairs with any diet"],
    bestFor: "Calorie control without counting.",
    emoji: "⏱️",
  },
];

export function getDiet(slug: string) {
  return DIETS.find((d) => d.slug === slug);
}
