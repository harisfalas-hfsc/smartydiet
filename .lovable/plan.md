# Guarantee complete paid diet plans

## Confirmed problem
- The affected four-week plan for `harisfalas@gmail.com` contains only days 1–4, 8, 15, and 22 although the questionnaire requests three meals per day.
- The validator checks meal counts and calories only on days returned by the AI. It does not reject missing weeks, missing day numbers, duplicate/out-of-range days, or a plan with fewer than `duration × 7` days.
- After two repair attempts, the current save path persists the plan even when validation errors remain.
- A full database audit found 3 invalid stored plan versions out of 9: two have incomplete week/day structures, and one older plan has incorrect meal counts.

## Implementation
1. **Make completeness a hard invariant**
   - Require exactly the purchased number of weeks.
   - Require exactly seven days in every week.
   - Require the exact global day sequence: week 1 = 1–7, week 2 = 8–14, week 3 = 15–21, and week 4 = 22–28.
   - Reject missing, duplicate, invalid, and out-of-order week/day numbers.
   - Require every day to contain exactly the questionnaire’s selected meal count, from 1 through 6.
   - Keep existing calorie, excluded-food, allergy, cultural, and diet-style validation.

2. **Define meal order explicitly**
   - 1 meal: Main meal / OMAD.
   - 2 meals: First meal, second meal, positioned within the selected eating window.
   - 3 meals: Breakfast, lunch, dinner.
   - 4 meals: Breakfast, morning snack, lunch, dinner.
   - 5 meals: Breakfast, morning snack, lunch, afternoon snack, dinner.
   - 6 meals: Breakfast, morning snack, lunch, afternoon snack, dinner, evening/before-bed snack.
   - Validate the generated meal slots and ordering instead of trusting prompt wording alone.

3. **Prevent long plans from being cut short**
   - Generate plans in bounded weekly units, each with exactly seven days, then assemble the complete plan and weekly grocery lists.
   - Validate each week immediately and repair only the invalid week, avoiding repeated full four-week generations and unnecessary AI cost.
   - Run one final whole-plan validation after assembly.

4. **Never deliver or charge for invalid output**
   - Do not insert a diet plan, consume a generation/refinement credit, mark an attempt generated, or complete payment capture while any hard validation issue remains.
   - Keep failed generation in the existing retry/support-alert flow until a valid full plan is persisted.
   - Return validation failures as generation failures, never as warning-only paid plans.

5. **Repair existing paid plans**
   - Rebuild all 3 audited invalid versions from their original questionnaire and purchased duration.
   - Replace each invalid version in place so version numbering and original/refined meaning remain intact.
   - Do not consume the customer’s remaining refinement, create a duplicate plan, or require another payment.
   - Re-audit every stored plan after repair and require zero invalid plans.

6. **Add regression coverage**
   - Test 1-, 2-, and 4-week plans for exact week/day sequences.
   - Test all meal counts 1–6 and their required meal-slot order.
   - Test missing weeks, missing days, duplicate days, wrong numbering, wrong meal counts, calorie violations, and forbidden ingredients.
   - Test that unresolved violations cannot reach persistence, credit consumption, generated status, or payment completion.
   - Verify the repaired four-week account in the rendered plan view and PDF starts at Week 1 Day 1 and contains all 28 days with three meals each.

## Permanent project rule
Every paid diet must pass deterministic structural validation before delivery: `purchased weeks × 7 days × selected meals per day`. Partial plans must never be saved, charged, or shown as complete. Fixes must audit and cover all equivalent records and generation paths, not only the reported example.
