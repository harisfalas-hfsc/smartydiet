import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mealSlotsFor, sortPlanStructure, splitIssues, type StrictRules, validatePlan } from "./plan-validation";

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
  for (const weeks of [1, 2]) {
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

  test("does not reject free-from labels or plant-based butter as dairy", () => {
    const plan = completePlan(1, 3);
    (plan.weeks[0].days[0].meals[0] as any).title = "Dairy-Free Tuna Salad";
    (plan.weeks[0].days[0].meals[0] as any).ingredients = [
      { qty: "1 tbsp", item: "peanut butter" },
      { qty: "1 tbsp", item: "natural nut butter" },
      { qty: "4 leaves", item: "butter lettuce" },
      { qty: "100 g", item: "lactose-free yogurt" },
    ];
    const strict = { ...rules(1, 3), excludeFoods: ["dairy", "lactose", "butter"] };
    assert.deepEqual(validatePlan(plan, strict), []);
  });

  test("still rejects actual dairy butter", () => {
    const plan = completePlan(1, 3);
    (plan.weeks[0].days[0].meals[0] as any).ingredients = [
      { qty: "1 tbsp", item: "garlic butter" },
    ];
    const strict = { ...rules(1, 3), excludeFoods: ["butter"] };
    assert.ok(validatePlan(plan, strict).some((issue) => issue.kind === "excluded_food"));
  });

  test("sortPlanStructure orders weeks, days and meals canonically", () => {
    const plan = completePlan(2, 4);
    plan.weeks.reverse();
    plan.weeks.forEach((week) => week.days.reverse());
    plan.weeks[0].days[0].meals.reverse();
    const sorted = sortPlanStructure(plan) as any;
    assert.equal(sorted.weeks[0].weekNumber, 1);
    assert.equal(sorted.weeks[0].days[0].day, 1);
    assert.equal(sorted.weeks[1].days[0].day, 8);
    assert.deepEqual(
      sorted.weeks[0].days[0].meals.map((meal: any) => meal.name),
      mealSlotsFor(4),
    );
    assert.deepEqual(validatePlan(sorted, rules(2, 4)), []);
  });
});

describe("issue severity", () => {
  test("blocks only structural issues, softens the rest", () => {
    const { blocking, soft } = splitIssues([
      { day: 0, weekNumber: 1, kind: "day_count", detail: "d" },
      { day: 3, weekNumber: 1, kind: "meal_count", detail: "m" },
      { day: 3, weekNumber: 1, kind: "calorie", detail: "c" },
      { day: 4, weekNumber: 1, kind: "excluded_food", detail: "e" },
    ]);
    assert.deepEqual(blocking.map((i) => i.kind), ["day_count", "meal_count"]);
    assert.deepEqual(soft.map((i) => i.kind), ["calorie", "excluded_food"]);
  });
});
