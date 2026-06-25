export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
};

export const ARTICLES: Article[] = [
  {
    slug: "how-many-calories-do-you-really-need",
    title: "How Many Calories Do You Really Need?",
    excerpt: "Understand BMR, TDEE and how to set a calorie target that actually works.",
    category: "Fundamentals",
    readMinutes: 6,
  },
  {
    slug: "protein-the-king-of-macros",
    title: "Protein: The King of Macros",
    excerpt: "Why protein matters more than you think, and how much you really need.",
    category: "Macros",
    readMinutes: 5,
  },
  {
    slug: "carbs-arent-the-enemy",
    title: "Carbs Aren't the Enemy",
    excerpt: "The truth about carbohydrates, energy, training performance and fat loss.",
    category: "Macros",
    readMinutes: 7,
  },
  {
    slug: "healthy-fats-explained",
    title: "Healthy Fats Explained",
    excerpt: "Saturated, unsaturated, omega-3s — what to eat more of and what to limit.",
    category: "Macros",
    readMinutes: 6,
  },
  {
    slug: "meal-timing-and-frequency",
    title: "Meal Timing and Frequency",
    excerpt: "Does it matter when or how often you eat? Here's what the science says.",
    category: "Habits",
    readMinutes: 5,
  },
  {
    slug: "hydration-the-forgotten-nutrient",
    title: "Hydration: The Forgotten Nutrient",
    excerpt: "Water is the simplest performance and recovery tool you have.",
    category: "Habits",
    readMinutes: 4,
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}
