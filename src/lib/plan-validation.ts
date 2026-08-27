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
        const searchable = [meal?.title, ...ingredientText].join(" ").toLowerCase();
        for (const excluded of rules.excludeFoods) {
          if (excluded && searchable.includes(excluded)) {
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