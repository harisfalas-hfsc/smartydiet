Fix the questionnaire, refinements, and generation so the AI actually obeys what the customer said.

1. Questionnaire: guided choices instead of typing

- Foods you like / dislike: replace free-text with selectable chips grouped by category (proteins: chicken, beef, eggs, fish, tuna, salmon, shrimp; dairy: milk, yogurt, cheese; carbs: rice, potatoes, pasta, bread, oats; veg: spinach, broccoli, tomato, salad; fruits; legumes; nuts) plus an "add your own" input for anything not listed.
- Allergies (required): quick chips for the common ones (none, nuts, peanuts, dairy/lactose, gluten, eggs, shellfish, fish, soy, sesame) plus free-text for the rest. "None" is a valid answer.
- Cultural/religious restrictions: chips (none, halal, kosher, no pork, no beef) + free text.
- Equipment / cooking: keep as chips (already good).

2. Fasting support

- Add "Intermittent fasting" as a diet style. When selected:
  - Eating window: 16:8, 18:6, 20:4, OMAD (one meal a day), custom.
  - Approach: balanced, aggressive, very aggressive (larger deficit).
- Allow meals per day = 1 when OMAD is chosen (current form forces min 2 — fix it).

3. Strict adherence engine (this is the core fix)

The AI must obey the customer's numbers and rules, not "approximate" them. Do this in three layers:

a. Prompt tightening

- The system prompt gets hard rules: exact meal count per day, exact calorie target (±25 kcal max), exclude every disliked/allergic food, respect fasting window (only meals inside it, no snacks outside), respect refinement instructions over the original questionnaire when they conflict.

b. Deterministic math check (server side, before saving)
After the AI returns the plan, the server calculates for each day:

- sum of meal calories vs the target
- meal count vs the requested count (or 1 for OMAD)
- presence of any excluded food (allergy/dislike keywords) in ingredients
If any check fails, the server sends the plan back to the AI with a short "fix this" message listing the specific violations, and asks it to return a corrected plan. Up to 2 auto-repair passes.

c. Refinement obedience
When the user writes a refinement (e.g. "one meal per day", "less dairy", "no fish", "more protein"), the server extracts explicit constraints from that text using the AI itself (short structured extraction call), merges them into the strict rule set, and the same math/exclusion checks then enforce them. So "one meal per day" is treated as: mealsPerDay=1 for this and future refinements in this session.

4. Credits — clearly answered

- The customer still gets exactly 3 credits total (1 initial + 2 refinements). This does not change.
- Auto-repair passes (the AI fixing its own math/exclusion mistakes) do NOT cost the customer an extra credit — they are the same generation, just corrected before we save it. The extra token cost is on us and is small.
- If after 2 auto-repair passes the plan still fails the checks, we still save it (best effort) and spend the credit, but we show a small warning on the plan ("some daily totals are off by X kcal") so the user knows.
- So no, users cannot refine endlessly — hard cap stays at 2 refinements.

5. Keep previous plans + rollback

- Every generation and refinement is already saved as a new version (v1, v2, v3). Currently only the newest is shown.
- Add a "Versions" panel on the plan page listing v1..vN with date and refinement note.
- Clicking a version shows that version's plan.
- "Restore this version" button sets it as the active/current one without spending a credit. The other versions stay accessible.

Technical section

- `src/lib/questionnaire-schema.ts`: add `fasting` fields (`window`, `approach`), extend `eating` with `likedFoods: string[]`, `dislikedFoods: string[]`, `allergyTags: string[]`, allow `mealsPerDay: 1`.
- `src/routes/_authenticated/questionnaire.tsx`: replace free-text like/dislike with grouped chip pickers + "add your own"; chip picker for allergies; fasting UI conditional on diet style; unblock 1 meal/day when fasting is on.
- `src/lib/plan.functions.ts`:
  - Rewrite `buildSystemPrompt` with the hard rules above.
  - Add `extractRefinementConstraints(refinement)` (AI SDK structured call) that returns `{ mealsPerDay?, excludeFoods?, includeMoreFoods?, calorieDelta?, fastingWindow?, notes? }`.
  - Add `validatePlan(plan, rules)` — pure JS: per-day calorie sum tolerance, meal count, banned ingredient scan.
  - Add auto-repair loop in `generatePlan` (max 2 passes) before persisting.
  - Add `restorePlanVersion({sessionId, version})` server fn — copies old plan into a new "restored" record marked active, no credit spent.
- `src/routes/_authenticated/plans.$sessionId.tsx`:
  - Load all versions, add Versions panel, active version highlighted.
  - "Restore this version" button wired to `restorePlanVersion`.
  - Show warning banner if the last generation didn't fully satisfy strict rules.
- Verify: `bun run build` + Playwright pass on questionnaire fasting flow + a generation smoke test. 