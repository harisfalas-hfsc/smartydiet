import { sortPlanStructure } from "@/lib/plan-validation";

export type GroceryItem = {
  item: string;
  qty: string;
  category: string;
};

export type GroceryCategory = {
  name: string;
  items: GroceryItem[];
};

export type GroceryWeek = {
  weekNumber: number;
  itemCount: number;
  categories: GroceryCategory[];
};

const CATEGORY_ORDER = [
  "Produce",
  "Meat & Poultry",
  "Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Frozen",
  "Spices & Seasonings",
  "Other",
];

const CATEGORY_ALIASES: Record<string, string> = {
  produce: "Produce",
  vegetables: "Produce",
  fruit: "Produce",
  meat: "Meat & Poultry",
  poultry: "Meat & Poultry",
  seafood: "Seafood",
  fish: "Seafood",
  dairy: "Dairy & Eggs",
  eggs: "Dairy & Eggs",
  baking: "Bakery",
  bakery: "Bakery",
  pantry: "Pantry",
  grains: "Pantry",
  frozen: "Frozen",
  spices: "Spices & Seasonings",
  seasonings: "Spices & Seasonings",
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function inferCategory(item: string): string {
  const value = item.toLowerCase();
  if (/apple|banana|berry|berries|broccoli|carrot|spinach|lettuce|tomato|onion|garlic|pepper|potato|avocado|lemon|lime|mushroom|zucchini|cauliflower|asparagus|herb|parsley|dill|cilantro|chive/.test(value)) return "Produce";
  if (/chicken|turkey|beef|pork|lamb|sausage|ham|bacon/.test(value)) return "Meat & Poultry";
  if (/salmon|tuna|cod|fish|shrimp|prawn|crab|seafood/.test(value)) return "Seafood";
  if (/milk|yogurt|cheese|cream|butter|egg/.test(value)) return "Dairy & Eggs";
  if (/bread|pita|wrap|tortilla|flour/.test(value)) return "Bakery";
  if (/frozen/.test(value)) return "Frozen";
  if (/salt|pepper|paprika|cumin|powder|cinnamon|spice|seasoning/.test(value)) return "Spices & Seasonings";
  if (/rice|pasta|oat|oil|vinegar|broth|stock|bean|lentil|quinoa|seed|nut|sauce|mayonnaise|tomatoes/.test(value)) return "Pantry";
  return "Other";
}

function normalizeCategory(category: unknown, item: string): string {
  const raw = clean(category).toLowerCase();
  return CATEGORY_ALIASES[raw] ?? (raw ? raw.replace(/\b\w/g, (letter) => letter.toUpperCase()) : inferCategory(item));
}

function validItem(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && clean((value as Record<string, unknown>).item));
}

function deriveIngredients(week: any): Record<string, unknown>[] {
  return (Array.isArray(week?.days) ? week.days : []).flatMap((day: any) =>
    (Array.isArray(day?.meals) ? day.meals : []).flatMap((meal: any) =>
      (Array.isArray(meal?.ingredients) ? meal.ingredients : []).filter(validItem),
    ),
  );
}

function splitQuantity(value: string): { amount: number; unit: string } | null {
  const match = value.match(/^\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  return Number.isFinite(amount) && unit ? { amount, unit } : null;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
}

function consolidate(items: GroceryItem[]): GroceryItem[] {
  const grouped = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const key = `${item.category.toLowerCase()}|${item.item.toLowerCase()}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return [...grouped.values()].flatMap((entries) => {
    const byUnit = new Map<string, { amount: number; sample: GroceryItem }>();
    const uncombined: GroceryItem[] = [];
    for (const entry of entries) {
      const parsed = splitQuantity(entry.qty);
      if (!parsed) {
        uncombined.push(entry);
        continue;
      }
      const existing = byUnit.get(parsed.unit);
      byUnit.set(parsed.unit, {
        amount: (existing?.amount ?? 0) + parsed.amount,
        sample: existing?.sample ?? entry,
      });
    }
    return [
      ...[...byUnit.entries()].map(([unit, value]) => ({
        ...value.sample,
        qty: `${formatAmount(value.amount)} ${unit}`,
      })),
      ...uncombined,
    ];
  });
}

export function prepareGroceryWeeks(plan: any): GroceryWeek[] {
  const sorted = sortPlanStructure(plan) as any;
  const weeks = Array.isArray(sorted?.weeks) ? sorted.weeks : [];
  return weeks.map((week: any, weekIndex: number) => {
    const stored = Array.isArray(week?.groceryList) ? week.groceryList.filter(validItem) : [];
    const source = stored.length > 0 ? stored : deriveIngredients(week);
    const normalized = consolidate(source.map((entry: Record<string, unknown>) => {
      const item = clean(entry.item);
      return {
        item,
        qty: clean(entry.qty) || "As needed",
        category: normalizeCategory(entry.category, item),
      };
    }));
    const grouped = new Map<string, GroceryItem[]>();
    for (const item of normalized) grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
    const categories = [...grouped.entries()]
      .map(([name, categoryItems]) => ({
        name,
        items: categoryItems.sort((a, b) => a.item.localeCompare(b.item)),
      }))
      .sort((a, b) => {
        const aRank = CATEGORY_ORDER.indexOf(a.name);
        const bRank = CATEGORY_ORDER.indexOf(b.name);
        return (aRank < 0 ? CATEGORY_ORDER.length : aRank) - (bRank < 0 ? CATEGORY_ORDER.length : bRank) || a.name.localeCompare(b.name);
      });
    return {
      weekNumber: Number(week?.weekNumber) || weekIndex + 1,
      itemCount: normalized.length,
      categories,
    };
  });
}

export function assertGroceryExportable(plan: any, weeks: GroceryWeek[]): void {
  const sourceWeeks = Array.isArray(plan?.weeks) ? plan.weeks : [];
  for (let index = 0; index < sourceWeeks.length; index += 1) {
    const hasIngredients = deriveIngredients(sourceWeeks[index]).length > 0;
    if (hasIngredients && (weeks[index]?.itemCount ?? 0) === 0) {
      throw new Error(`Week ${index + 1} has meals but no usable grocery items. The PDF was not created.`);
    }
  }
  if (sourceWeeks.length > 0 && weeks.every((week) => week.itemCount === 0)) {
    throw new Error("This plan has no usable grocery items. The PDF was not created.");
  }
}