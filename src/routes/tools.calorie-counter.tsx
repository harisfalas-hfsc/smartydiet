import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Flame, Beef, Wheat, Droplets, Leaf, Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tools/calorie-counter")({
  head: () => ({
    meta: [
      { title: "Calorie Counter — Calories & macros per portion | SmartyDiet" },
      {
        name: "description",
        content:
          "Quick calorie counter for common foods. Pick a food, enter grams, and instantly see calories, protein, carbs, fat and fiber for your portion.",
      },
      { property: "og:title", content: "Calorie Counter | SmartyDiet" },
      {
        property: "og:description",
        content: "Calories and macros for your portion — free tool by SmartyDiet.",
      },
    ],
  }),
  component: CalorieCounterPage,
});

// Per 100g values from standard USDA references (approximate, for planning use).
type Food = {
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const FOODS: Food[] = [
  // Proteins
  { name: "Chicken breast, skinless", category: "Protein", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: "Chicken thigh, skinless", category: "Protein", calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0 },
  { name: "Beef steak, lean", category: "Protein", calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0 },
  { name: "Ground beef, 90% lean", category: "Protein", calories: 176, protein: 20, carbs: 0, fat: 10, fiber: 0 },
  { name: "Pork loin", category: "Protein", calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0 },
  { name: "Turkey breast", category: "Protein", calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0 },
  { name: "Salmon, cooked", category: "Protein", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  { name: "Tuna, canned in water", category: "Protein", calories: 132, protein: 28, carbs: 0, fat: 1, fiber: 0 },
  { name: "Shrimp, cooked", category: "Protein", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0 },
  { name: "Egg, whole", category: "Protein", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
  { name: "Egg white", category: "Protein", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0 },
  { name: "Tofu, firm", category: "Protein", calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2 },
  { name: "Greek yogurt, plain nonfat", category: "Protein", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
  { name: "Cottage cheese, low-fat", category: "Protein", calories: 82, protein: 11, carbs: 4, fat: 2.3, fiber: 0 },
  { name: "Whey protein powder", category: "Protein", calories: 400, protein: 80, carbs: 8, fat: 6, fiber: 1 },
  // Grains & starches
  { name: "White rice, cooked", category: "Grains", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: "Brown rice, cooked", category: "Grains", calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8 },
  { name: "Pasta, cooked", category: "Grains", calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8 },
  { name: "Oats, dry", category: "Grains", calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 10.6 },
  { name: "Bread, whole wheat", category: "Grains", calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7 },
  { name: "Quinoa, cooked", category: "Grains", calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
  { name: "Potato, boiled", category: "Grains", calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8 },
  { name: "Sweet potato, baked", category: "Grains", calories: 90, protein: 2, carbs: 21, fat: 0.1, fiber: 3.3 },
  // Vegetables
  { name: "Broccoli", category: "Vegetables", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  { name: "Spinach", category: "Vegetables", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: "Carrot", category: "Vegetables", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  { name: "Tomato", category: "Vegetables", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  { name: "Cucumber", category: "Vegetables", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  { name: "Bell pepper", category: "Vegetables", calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  // Fruits
  { name: "Apple", category: "Fruits", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
  { name: "Banana", category: "Fruits", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
  { name: "Orange", category: "Fruits", calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 },
  { name: "Strawberries", category: "Fruits", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  { name: "Blueberries", category: "Fruits", calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
  { name: "Avocado", category: "Fruits", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 6.7 },
  // Legumes & nuts
  { name: "Lentils, cooked", category: "Legumes", calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
  { name: "Chickpeas, cooked", category: "Legumes", calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6 },
  { name: "Black beans, cooked", category: "Legumes", calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7 },
  { name: "Almonds", category: "Nuts & seeds", calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5 },
  { name: "Walnuts", category: "Nuts & seeds", calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7 },
  { name: "Peanut butter", category: "Nuts & seeds", calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
  // Dairy
  { name: "Milk, whole", category: "Dairy", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  { name: "Milk, skim", category: "Dairy", calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0 },
  { name: "Cheddar cheese", category: "Dairy", calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0 },
  { name: "Mozzarella, part-skim", category: "Dairy", calories: 254, protein: 24.3, carbs: 2.8, fat: 15.9, fiber: 0 },
  // Fats & oils
  { name: "Olive oil", category: "Fats", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "Butter", category: "Fats", calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },
];

function CalorieCounterPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOODS.slice(0, 12);
    return FOODS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [query]);

  const gramsNum = parseFloat(grams) || 0;
  const multiplier = gramsNum / 100;

  const adjustGrams = (delta: number) => {
    setGrams((prev) => String(Math.max(1, (parseInt(prev) || 0) + delta)));
  };

  const macros = selected
    ? [
        {
          label: "Calories",
          value: (selected.calories * multiplier).toFixed(0),
          unit: "kcal",
          Icon: Flame,
        },
        {
          label: "Protein",
          value: (selected.protein * multiplier).toFixed(1),
          unit: "g",
          Icon: Beef,
        },
        {
          label: "Carbs",
          value: (selected.carbs * multiplier).toFixed(1),
          unit: "g",
          Icon: Wheat,
        },
        {
          label: "Fat",
          value: (selected.fat * multiplier).toFixed(1),
          unit: "g",
          Icon: Droplets,
        },
        {
          label: "Fiber",
          value: (selected.fiber * multiplier).toFixed(1),
          unit: "g",
          Icon: Leaf,
        },
      ]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyDiet Tools — Free to Use
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Calorie Counter
        </h1>
      </div>

      <Card className="mb-4 border-2 border-primary/40">
        <CardContent className="p-3">
          <p className="text-center text-sm text-muted-foreground">
            Pick a food, set the portion in grams, and instantly see{" "}
            <span className="font-semibold text-primary">calories and macros</span>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search food (e.g. chicken, rice, banana)…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected) setSelected(null);
              }}
              className="pl-10"
            />
          </div>

          {!selected && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {results.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No foods match "{query}". Try another term.
                </p>
              )}
              {results.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setSelected(f)}
                  className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-accent"
                >
                  <span className="text-sm font-medium text-foreground">{f.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {f.calories} kcal/100g
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.category}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Portion (grams)
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => adjustGrams(-10)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    className="text-center"
                  />
                  <Button variant="outline" size="icon" onClick={() => adjustGrams(10)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {macros && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {macros.map(({ label, value, unit, Icon }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-card p-3 text-center"
                    >
                      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-lg font-bold text-foreground">
                        {value}
                        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                          {unit}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                  setGrams("100");
                }}
              >
                Search another food
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Values per 100g based on standard USDA references. For planning use only.
      </p>
    </div>
  );
}
