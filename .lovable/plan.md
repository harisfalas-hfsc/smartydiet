# Cap plans at 2 weeks + clearer day navigation

## 1. Remove the 4-week option

Yes — dropping 4 weeks is the right call. A 4-week plan is 28 days × up to 6 meals = up to 168 generated meals; that is where truncation and long-generation failures come from. 1 and 2 weeks generate reliably, and anyone who wants a month simply repeats their plan (2-week plan × 2, or 1-week plan × 4).

Changes:
- Questionnaire duration picker: options become 1 week and 2 weeks only (default stays 2 weeks), with a short note: "Need a month? Repeat your 2-week plan twice — the structure is designed to cycle."
- Checkout, payment metadata, free-access flow and plan-creation types accept only 1 or 2 weeks; anything else is rejected server-side.
- Copy updates everywhere "1, 2 or 4 weeks" appears: terms, glossary, diet-plans pages, nutrition library, FAQ, pricing, how-it-works.
- Existing 4-week plans already in the database stay viewable and untouched.

## 2. Week 1 / Day 1 always first, with clear labels and jump links

- At the top of the plan, add a navigation block: week buttons plus, for the selected week, day buttons Day 1 … Day 7 with the actual weekday label.
- Every day card gets a heading "Week 1 · Day 1" (not just "Day 1") and its own anchor so jump links land exactly on it.
- Ordering is normalized at render: weeks sorted by week number, days sorted by day number, meals in fixed slot order (Breakfast → Morning snack → Lunch → Afternoon snack → Dinner → Evening snack, trimmed to the meal count chosen).

## 3. Stored plan data ordering

- Normalize week/day/meal ordering when a plan is saved, so what is stored is already in order rather than only fixed at display time.
- On opening a plan and on switching version, the view resets to the top of Week 1 Day 1.

## 4. Credits refresh immediately after refining

Today the credits line ("1 refinement remaining", "1/2") comes from a session record loaded once. After a refinement completes, the page will re-read the session record in the same step that loads the new version, so the counter and the disabled state of the refine button update instantly with no reload.

## Technical notes

- `src/routes/_authenticated/questionnaire.tsx`: `1 | 2 | 4` → `1 | 2`, radio grid to 2 columns.
- `src/lib/payments.functions.ts`, `src/lib/plan.functions.ts`, `src/lib/free-access.functions.ts`: narrow the duration union and the `[1,2,4].includes(...)` guard.
- `src/components/plans/PlanContent.tsx`: week+day jump navigation, "Week N · Day N" headings, `scroll-mt-24` anchors, meal-slot ordering.
- `src/lib/plan-generation.server.ts`: sort weeks/days/meals before persisting; keep the existing strict validator (weeks × 7 days, exact meal count).
- `src/routes/_authenticated/plans.$sessionId.tsx`: refetch the session row after a successful refinement; keep the generation waiting screen during refine.
- Extend `src/lib/plan-validation.test.ts` for the 1- and 2-week combinations and ordering.
