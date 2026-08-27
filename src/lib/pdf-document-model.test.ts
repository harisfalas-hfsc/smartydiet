import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { assertGroceryExportable, prepareGroceryWeeks } from "./pdf-document-model";

function planWithIngredients(weeks = 2) {
  return {
    weeks: Array.from({ length: weeks }, (_, weekIndex) => ({
      weekNumber: weekIndex + 1,
      days: [{
        day: weekIndex * 7 + 1,
        meals: [{ ingredients: [
          { item: "Chicken breast", qty: "200 g" },
          { item: "Chicken breast", qty: "150 g" },
          { item: "Olive oil", qty: "1 tbsp" },
          { item: "Olive oil", qty: "to taste" },
          { item: "Broccoli", qty: "2 cups" },
        ] }],
      }],
    })),
  };
}

describe("PDF grocery document model", () => {
  test("derives missing legacy grocery lists from meal ingredients", () => {
    const weeks = prepareGroceryWeeks(planWithIngredients());
    assert.equal(weeks.length, 2);
    assert.ok(weeks.every((week) => week.itemCount > 0));
    assert.doesNotThrow(() => assertGroceryExportable(planWithIngredients(), weeks));
  });

  test("combines only matching numeric units without guessing", () => {
    const [week] = prepareGroceryWeeks(planWithIngredients(1));
    const all = week?.categories.flatMap((category) => category.items) ?? [];
    assert.ok(all.some((item) => item.item === "Chicken breast" && item.qty === "350 g"));
    assert.ok(all.some((item) => item.item === "Olive oil" && item.qty === "1 tbsp"));
    assert.ok(all.some((item) => item.item === "Olive oil" && item.qty === "to taste"));
  });

  test("uses valid stored grocery lists and preserves four-week legacy plans", () => {
    const plan = planWithIngredients(4);
    plan.weeks.forEach((week, index) => {
      (week as any).groceryList = [{ item: `Week ${index + 1} item`, qty: "1 pack", category: "Pantry" }];
    });
    const weeks = prepareGroceryWeeks(plan);
    assert.equal(weeks.length, 4);
    assert.deepEqual(weeks.map((week) => week.itemCount), [1, 1, 1, 1]);
  });

  test("rejects a plan that cannot produce grocery content", () => {
    const plan = { weeks: [{ weekNumber: 1, days: [{ day: 1, meals: [] }] }] };
    assert.throws(() => assertGroceryExportable(plan, prepareGroceryWeeks(plan)), /no usable grocery items/i);
  });
});