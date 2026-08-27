import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mealSlotsFor, type StrictRules, validatePlan } from "./plan-validation";

function completePlan(weeks: number, mealsPerDay: number) {
  const slots = mealSlotsFor(mealsPerDay);
  return {
    weeks: Array.from({ length: weeks }, (_, weekIndex) => ({
      weekNumber: weekIndex + 1,
      days: Array.from({ length: 7 }, (_, dayIndex) => ({
        day: weekIndex * 7 + dayIndex + 1,
        meals: slots.map((name) => ({ name, title: name, ingredients: [], calories: 600 / mealsPerDay })),
      })),
      groceryList: [],
    })),
  };
}

function rules(weeks: number, mealsPerDay: number): StrictRules {
  return {
    weeks,
    mealsPerDay,
    calorieTarget: 600,
    calorieTolerance: 1,
    excludeFoods: [],
    dietStyle: "balanced",
    goal: "maintenance",
  };
}

describe("paid plan structural validation", () => {
  for (const weeks of [1, 2, 4]) {
    for (const meals of [1, 2, 3, 4, 5, 6]) {
      test(`${weeks} week(s), ${meals} meal(s) is complete`, () => {
        assert.deepEqual(validatePlan(completePlan(weeks, meals), rules(weeks, meals)), []);
      });
    }
  }

  test("rejects missing weeks and days", () => {
    const plan = completePlan(4, 3);
    plan.weeks[0].days.splice(4);
    plan.weeks.splice(2, 1);
    const kinds = validatePlan(plan, rules(4, 3)).map((issue) => issue.kind);
    assert.ok(kinds.includes("week_count"));
    assert.ok(kinds.includes("day_count"));
    assert.ok(kinds.includes("week_number"));
  });

  test("rejects duplicate or reset day numbers", () => {
    const plan = completePlan(2, 3);
    plan.weeks[1].days.forEach((day, index) => { day.day = index + 1; });
    assert.ok(validatePlan(plan, rules(2, 3)).some((issue) => issue.kind === "day_number"));
  });

  test("rejects wrong meal count and slot order", () => {
    const plan = completePlan(1, 5);
    plan.weeks[0].days[0].meals.pop();
    plan.weeks[0].days[1].meals[1].name = "Dinner";
    const kinds = validatePlan(plan, rules(1, 5)).map((issue) => issue.kind);
    assert.ok(kinds.includes("meal_count"));
    assert.ok(kinds.includes("meal_order"));
  });

  test("rejects calorie and excluded-food violations", () => {
    const plan = completePlan(1, 3);
    plan.weeks[0].days[0].meals[0].calories = 900;
    (plan.weeks[0].days[1].meals[0] as any).ingredients = [
      { qty: "1", item: "peanut butter" },
    ];
    const strict = { ...rules(1, 3), excludeFoods: ["peanut"] };
    const kinds = validatePlan(plan, strict).map((issue) => issue.kind);
    assert.ok(kinds.includes("calorie"));
    assert.ok(kinds.includes("excluded_food"));
  });
});