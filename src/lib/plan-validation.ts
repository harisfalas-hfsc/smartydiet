export interface StrictRules {
  mealsPerDay: number;
  calorieTarget: number;
  calorieTolerance: number;
  excludeFoods: string[];
  dietStyle: string;
  goal: string;
  fastingWindow?: string;
  weeks: number;
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
