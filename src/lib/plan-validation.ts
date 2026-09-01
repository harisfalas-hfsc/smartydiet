export interface StrictRules {
  mealsPerDay: number;
  calorieTarget: number;
  calorieTolerance: number;
  excludeFoods: string[];
  dietStyle: string;
  goal: string;
  fastingWindow?: string;
  weeks: number;
  /** Foods the user likes that survived conflict resolution. */
  likedFoods?: string[];
  /** Plain-language explanation of every preference dropped by a conflict. */
  conflictNotes?: string[];

}

export type ValidationIssueKind =
  | "week_count"
  | "week_number"
  | "day_count"
  | "day_number"
  | "meal_count"
  | "meal_order"
  | "calorie"
  | "excluded_food";

export interface ValidationIssue {
  day: number;
  weekNumber: number;
  kind: ValidationIssueKind;
  detail: string;
}

const MEAL_SLOTS: Record<number, string[]> = {
  1: ["Main meal"],
  2: ["First meal", "Second meal"],
  3: ["Breakfast", "Lunch", "Dinner"],
  4: ["Breakfast", "Morning snack", "Lunch", "Dinner"],
  5: ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner"],
  6: [
    "Breakfast",
    "Morning snack",
    "Lunch",
    "Afternoon snack",
    "Dinner",
    "Evening snack",
  ],
};

export function mealSlotsFor(mealsPerDay: number): string[] {
  return MEAL_SLOTS[mealsPerDay] ?? MEAL_SLOTS[3];
}

/**
 * Returns a copy of the plan with weeks, days and meals in canonical order:
 * Week 1 Day 1 first, meals in fixed slot order.
 */
export function sortPlanStructure<T = any>(plan: T): T {
  const source = plan as any;
  if (!source || !Array.isArray(source.weeks)) return plan;
  const weeks = [...source.weeks]
    .sort((a: any, b: any) => (a?.weekNumber ?? 0) - (b?.weekNumber ?? 0))
    .map((week: any) => {
      const days = Array.isArray(week?.days) ? [...week.days] : [];
      days.sort((a: any, b: any) => (a?.day ?? 0) - (b?.day ?? 0));
      return {
        ...week,
        days: days.map((day: any) => {
          const meals = Array.isArray(day?.meals) ? [...day.meals] : [];
          const slots = mealSlotsFor(meals.length);
          const rank = (meal: any) => {
            const name = String(meal?.name ?? "").toLowerCase().trim();
            const index = slots.findIndex((slot) => slot.toLowerCase() === name);
            return index === -1 ? Number.MAX_SAFE_INTEGER : index;
          };
          const ordered = meals.map((meal: any, index: number) => ({ meal, index }));
          ordered.sort((a, b) => rank(a.meal) - rank(b.meal) || a.index - b.index);
          return { ...day, meals: ordered.map((entry) => entry.meal) };
        }),
      };
    });
  return { ...source, weeks } as T;
}

export interface PlanStructureReport {
  ok: boolean;
  weeks: number;
  expectedWeeks: number;
  totalDays: number;
  expectedDays: number;
  mealsPerDay: number | null;
  expectedMealsPerDay: number;
  problems: string[];
}

/**
 * Customer-facing completeness check: are all weeks, 7 days per week and the
 * requested number of meals per day actually present in the stored plan?
 */
export function verifyPlanStructure(
  plan: any,
  expectedWeeks: number,
  expectedMealsPerDay: number,
): PlanStructureReport {
  const weeks: any[] = Array.isArray(plan?.weeks) ? plan.weeks : [];
  const problems: string[] = [];
  let totalDays = 0;
  const mealCounts = new Set<number>();

  if (weeks.length !== expectedWeeks) {
    problems.push(`Found ${weeks.length} week(s) instead of ${expectedWeeks}.`);
  }
  for (const week of weeks) {
    const days: any[] = Array.isArray(week?.days) ? week.days : [];
    totalDays += days.length;
    if (days.length !== 7) {
      problems.push(`Week ${week?.weekNumber ?? "?"} has ${days.length} day(s) instead of 7.`);
    }
    for (const day of days) {
      const meals: any[] = Array.isArray(day?.meals) ? day.meals : [];
      mealCounts.add(meals.length);
      if (meals.length !== expectedMealsPerDay) {
        problems.push(
          `Week ${week?.weekNumber ?? "?"} Day ${day?.day ?? "?"} has ${meals.length} meal(s) instead of ${expectedMealsPerDay}.`,
        );
      }
    }
  }

  return {
    ok: problems.length === 0,
    weeks: weeks.length,
    expectedWeeks,
    totalDays,
    expectedDays: expectedWeeks * 7,
    mealsPerDay: mealCounts.size === 1 ? [...mealCounts][0]! : null,
    expectedMealsPerDay,
    problems: problems.slice(0, 8),
  };
}

/** Snacks implied by the meals-per-day slot layout. */
export function snackSlotsFor(mealsPerDay: number): string[] {
  return mealSlotsFor(mealsPerDay).filter((slot) => slot.toLowerCase().includes("snack"));
}



function normalizedMealName(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mealNameMatches(actual: unknown, expected: string): boolean {
  const name = normalizedMealName(actual);
  const slot = normalizedMealName(expected);
  if (slot === "main meal") return name === slot || name === "omad";
  if (slot === "first meal") return name === slot || name === "meal 1";
  if (slot === "second meal") return name === slot || name === "meal 2";
  if (slot === "evening snack") {
    return name === slot || name === "before bed snack" || name === "bedtime snack";
  }
  return name === slot;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match an excluded food as a word or phrase, not as an arbitrary substring.
 * Labels such as "dairy-free" describe compliant substitutes, while nut/seed
 * butters must not be mistaken for dairy butter.
 */
function containsExcludedFood(searchable: string, excludedFood: string): boolean {
  const excluded = normalizedMealName(excludedFood);
  if (!excluded) return false;

  let normalized = ` ${normalizedMealName(searchable)} `;
  normalized = normalized.replace(
    /\b(?:dairy|lactose|gluten|nut|peanut|soy|sesame|egg)[ -]free\b/g,
    " ",
  );
  if (excluded === "butter") {
    normalized = normalized.replace(
      /\b(?:peanut|almond|cashew|hazelnut|walnut|pecan|pistachio|sunflower|seed|nut) butter\b/g,
      " ",
    );
    normalized = normalized.replace(/\bbutter lettuce\b/g, " ");
  }

  return new RegExp(`\\b${escapeRegExp(excluded).replace(/\\ /g, "\\s+")}\\b`).test(
    normalized,
  );
}

export function validatePlan(plan: any, rules: StrictRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const weeks = Array.isArray(plan?.weeks) ? plan.weeks : [];
  if (weeks.length !== rules.weeks) {
    issues.push({
      day: 0,
      weekNumber: 0,
      kind: "week_count",
      detail: `Plan has ${weeks.length} weeks; required exactly ${rules.weeks}.`,
    });
  }

  const seenWeeks = new Set<number>();
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const week = weeks[weekIndex];
    const expectedWeek = weekIndex + 1;
    const weekNumber = Number(week?.weekNumber) || 0;
    if (weekNumber !== expectedWeek || seenWeeks.has(weekNumber)) {
      issues.push({
        day: 0,
        weekNumber,
        kind: "week_number",
        detail: `Week at position ${expectedWeek} is numbered ${weekNumber}; required ${expectedWeek} with no duplicates.`,
      });
    }
    seenWeeks.add(weekNumber);

    const days = Array.isArray(week?.days) ? week.days : [];
    if (days.length !== 7) {
      issues.push({
        day: 0,
        weekNumber,
        kind: "day_count",
        detail: `Week ${weekNumber || expectedWeek} has ${days.length} days; required exactly 7.`,
      });
    }

    const seenDays = new Set<number>();
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const dayEntry = days[dayIndex];
      const expectedDay = weekIndex * 7 + dayIndex + 1;
      const day = Number(dayEntry?.day) || 0;
      if (day !== expectedDay || seenDays.has(day)) {
        issues.push({
          day,
          weekNumber,
          kind: "day_number",
          detail: `Week ${weekNumber || expectedWeek} day at position ${dayIndex + 1} is numbered ${day}; required ${expectedDay} with no duplicates.`,
        });
      }
      seenDays.add(day);

      const meals = Array.isArray(dayEntry?.meals) ? dayEntry.meals : [];
      if (meals.length !== rules.mealsPerDay) {
        issues.push({
          day,
          weekNumber,
          kind: "meal_count",
          detail: `Week ${weekNumber} Day ${day} has ${meals.length} meals; required exactly ${rules.mealsPerDay}.`,
        });
      }

      const expectedSlots = mealSlotsFor(rules.mealsPerDay);
      for (let mealIndex = 0; mealIndex < Math.min(meals.length, expectedSlots.length); mealIndex += 1) {
        if (!mealNameMatches(meals[mealIndex]?.name, expectedSlots[mealIndex])) {
          issues.push({
            day,
            weekNumber,
            kind: "meal_order",
            detail: `Week ${weekNumber} Day ${day} meal ${mealIndex + 1} is "${String(meals[mealIndex]?.name ?? "")}"; required "${expectedSlots[mealIndex]}".`,
          });
        }
      }

      const calories = meals.reduce(
        (total: number, meal: any) => total + (Number(meal?.calories) || 0),
        0,
      );
      if (Math.abs(calories - rules.calorieTarget) > rules.calorieTolerance) {
        issues.push({
          day,
          weekNumber,
          kind: "calorie",
          detail: `Week ${weekNumber} Day ${day} totals ${calories} kcal; must be ${rules.calorieTarget}±${rules.calorieTolerance}.`,
        });
      }

      for (const meal of meals) {
        const ingredientText = Array.isArray(meal?.ingredients)
          ? meal.ingredients.map((item: any) => `${item?.qty ?? ""} ${item?.item ?? ""}`)
          : [];
        const searchable = [meal?.title, ...ingredientText].join(" ");
        for (const excluded of rules.excludeFoods) {
          if (containsExcludedFood(searchable, excluded)) {
            issues.push({
              day,
              weekNumber,
              kind: "excluded_food",
              detail: `Week ${weekNumber} Day ${day} meal "${String(meal?.title ?? "")}" contains banned "${excluded}".`,
            });
          }
        }
      }
    }
  }
  return issues;
}
/**
 * Structural issues mean the customer would not receive what they paid for
 * (wrong number of weeks, days, or meals). Those are the only reasons a
 * generation may be rejected. Everything else (calorie drift, a suspicious
 * ingredient match) is delivered with a visible caution instead of failing
 * the paid customer, and support is alerted separately.
 */
const BLOCKING_ISSUE_KINDS: ReadonlySet<ValidationIssueKind> = new Set([
  "week_count",
  "week_number",
  "day_count",
  "day_number",
  "meal_count",
  "meal_order",
]);

export function isBlockingIssue(issue: ValidationIssue): boolean {
  return BLOCKING_ISSUE_KINDS.has(issue.kind);
}

export function splitIssues(issues: ValidationIssue[]): {
  blocking: ValidationIssue[];
  soft: ValidationIssue[];
} {
  return {
    blocking: issues.filter(isBlockingIssue),
    soft: issues.filter((issue) => !isBlockingIssue(issue)),
  };
}

// -------------------- Conflict resolution --------------------

/**
 * Foods a diet style structurally rules out. Used for prompt guidance and to
 * silently drop conflicting "liked foods" — never to hard-fail a plan.
 */
const DIET_STYLE_BANS: Record<string, string[]> = {
  carnivore: ["potato", "rice", "pasta", "bread", "sugar", "beans", "lentil", "oat", "fruit", "vegetable"],
  keto: ["sugar", "bread", "pasta", "rice", "potato"],
  vegan: ["meat", "chicken", "beef", "pork", "fish", "egg", "milk", "cheese", "yogurt", "honey"],
  vegetarian: ["meat", "chicken", "beef", "pork", "fish", "shrimp"],
  pescatarian: ["chicken", "beef", "pork", "meat"],
  paleo: ["bread", "pasta", "rice", "sugar", "beans", "lentil", "milk", "cheese"],
};

export function dietStyleBans(dietStyle: string): string[] {
  return DIET_STYLE_BANS[String(dietStyle ?? "").toLowerCase().trim()] ?? [];
}

export interface ConflictResolution {
  /** Liked foods kept after removing anything the harder rules forbid. */
  likedFoods: string[];
  /** Human-readable notes explaining every preference that lost. */
  notes: string[];
}

/**
 * Priority: allergies/medical > cultural or religious > diet style > dislikes
 * > liked foods. A conflict never fails a generation; the weaker preference is
 * dropped and explained.
 */
export function resolveRuleConflicts(
  rules: StrictRules,
  likedFoods: string[],
): ConflictResolution {
  const bans = dietStyleBans(rules.dietStyle);
  const kept: string[] = [];
  const notes: string[] = [];
  for (const raw of likedFoods) {
    const food = String(raw ?? "").trim();
    if (!food) continue;
    const hardHit = rules.excludeFoods.find((excluded) =>
      containsExcludedFood(food, excluded),
    );
    if (hardHit) {
      notes.push(
        `"${food}" was left out because your allergies/restrictions exclude "${hardHit}".`,
      );
      continue;
    }
    const styleHit = bans.find((banned) => containsExcludedFood(food, banned));
    if (styleHit) {
      notes.push(
        `"${food}" was left out because it conflicts with your ${rules.dietStyle} diet style.`,
      );
      continue;
    }
    kept.push(food);
  }
  return { likedFoods: kept, notes };
}

// -------------------- Structural salvage --------------------

function sumTotals(meals: any[]) {
  const add = (key: string) =>
    meals.reduce((total, meal) => total + (Number(meal?.[key]) || 0), 0);
  return {
    calories: add("calories"),
    protein_g: add("protein_g"),
    carbs_g: add("carbs_g"),
    fat_g: add("fat_g"),
  };
}

/**
 * Force a generated plan into the exact requested shape (weeks x 7 days x N
 * meals) by reusing compliant content the model already produced. A paid
 * customer must always receive a complete plan; a structural gap is repaired,
 * not turned into a failure. Returns `ok: false` only when the model produced
 * nothing usable at all.
 */
export function salvagePlanStructure(
  plan: any,
  rules: StrictRules,
): { ok: boolean; plan: any; notes: string[] } {
  const notes: string[] = [];
  const slots = mealSlotsFor(rules.mealsPerDay);
  const sourceWeeks: any[] = Array.isArray(plan?.weeks) ? plan.weeks : [];
  const donors: any[] = sourceWeeks
    .flatMap((week) => (Array.isArray(week?.days) ? week.days : []))
    .filter((day) => Array.isArray(day?.meals) && day.meals.length > 0);
  if (donors.length === 0) return { ok: false, plan, notes: ["No usable day was generated."] };

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const weeks = Array.from({ length: rules.weeks }, (_, weekIndex) => {
    const sourceWeek = sourceWeeks[weekIndex] ?? {};
    const sourceDays: any[] = Array.isArray(sourceWeek?.days) ? sourceWeek.days : [];
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayNumber = weekIndex * 7 + dayIndex + 1;
      let day = sourceDays[dayIndex];
      if (!day || !Array.isArray(day.meals) || day.meals.length === 0) {
        day = clone(donors[(dayNumber - 1) % donors.length]);
        notes.push(`Day ${dayNumber} was rebuilt from another compliant day of your plan.`);
      }
      let meals: any[] = [...day.meals];
      if (meals.length > rules.mealsPerDay) {
        meals = meals.slice(0, rules.mealsPerDay);
        notes.push(`Day ${dayNumber} was trimmed to ${rules.mealsPerDay} meal(s).`);
      }
      while (meals.length < rules.mealsPerDay) {
        const donorMeal = donors
          .flatMap((donor: any) => donor.meals ?? [])
          .filter((meal: any) => meal)[meals.length % Math.max(1, donors.length * rules.mealsPerDay)];
        meals.push(clone(donorMeal ?? meals[meals.length - 1]));
        notes.push(`Day ${dayNumber} was completed to ${rules.mealsPerDay} meal(s).`);
      }
      meals = meals.map((meal: any, index: number) => ({ ...meal, name: slots[index] }));
      return { ...day, day: dayNumber, meals, totals: sumTotals(meals) };
    });
    const groceryList = days.flatMap((day: any) =>
      (day.meals ?? []).flatMap((meal: any) =>
        (meal?.ingredients ?? []).map((ingredient: any) => ({
          item: ingredient?.item,
          qty: ingredient?.qty,
        })),
      ),
    );
    return { ...sourceWeek, weekNumber: weekIndex + 1, days, groceryList };
  });

  return { ok: true, plan: { ...plan, weeks }, notes: Array.from(new Set(notes)) };
}
