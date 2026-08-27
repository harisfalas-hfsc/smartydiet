# One refine per purchase + a single Nutrition Library page

## 1. One refine per payment (2 credits total)

Each purchase currently gets 3 AI generations: the first plan plus 2 refinements. New purchases get 2: the original plan (version 1) and one refine (version 2). After refining, the card shows "Credits 2/2 used" and the refine box is replaced by a short note that this plan's refine has been used.

Existing already-paid plans keep the credits they already have — nothing is taken away.

## 2. Remove the confusing "Restore" / active-version idea

Both versions are always kept and always openable:

- A simple switcher: "Version 1 — original" and "Version 2 — refined".
- Tapping a version shows it immediately (today "View" appears to do nothing because the page doesn't move); the page scrolls to the plan and labels which version is on screen.
- "Restore" button and the "restoring does not cost a credit" note are removed.
- The page opens on the newest version; PDF downloads export the version being viewed.

## 3. Same waiting screen when refining

Refining currently only spins the button. It will show the exact same screen as the first generation: "Building your plan… this can take up to 2 minutes", the rotating "Did you know?" nutrition tips and the "stay on this page" note — with the previous version still readable underneath.

## 4. Fix "2 refinements / 3 credits" wording everywhere

Every page that promises two refinements is corrected to one:

- Pricing: "1 free refinement", and the page description/meta text.
- Homepage: "Includes 1 initial plan + 1 refinement."
- Checkout: "one plan, 1 initial generation + 1 refinement".
- FAQ: both answers that mention 2 refinements / 3 AI generations.
- Terms: "up to two refinement requests" and the "3 credits" paragraph.
- Privacy: refinement-credit wording.
- Nutrition Intelligence and the Weight-loss diet page: "2 refinements included".
- How It Works and About: reviewed and updated wherever refinements/credits are implied.
- Plans list empty-state copy adjusted to the single-refinement wording.

## 5. Discovery menu rearranged

New order:

```text
Home
About
How It Works
Pricing
Tools
Frequently Asked Questions
Nutrition Library      <- new single hub page
Contact
```

Diet Plans, Meal Planning, Sports Nutrition, The Diet Science and Nutrition Intelligence are removed from the menu as separate entries.

## 6. New "Nutrition Library" hub page

One page at `/nutrition-library` that gathers all the knowledge content, with its own in-page menu (a sticky list of sections that jumps you down the page):

```text
1. Nutrition Intelligence
2. The Diet Science
3. Diet Plans        (overview + weight loss, muscle gain, high protein)
4. Meal Planning Guide
5. Sports Nutrition
6. Glossary
```

The existing individual pages stay live at their current URLs so search rankings and existing links are not lost — the library page summarises each area and links into it, and each section is also expandable in place so a visitor can read everything without leaving the page. The Glossary moves under the library rather than sitting on its own menu row.

## Technical notes

- Migration: `generation_sessions.credits_total` default 3 → 2 (new rows only).
- `src/routes/_authenticated/plans.$sessionId.tsx`: drop `restorePlanVersion` usage, rework the versions card into a labelled switcher, reuse the `autoGenerating` tips block during `refine()`.
- `src/lib/plan-generation.server.ts`: newest version = highest `version`; keep writing `is_final` on the latest row for compatibility with admin views.
- New route `src/routes/nutrition-library.tsx` with anchored sections and its own `head()` metadata; `src/components/Navigation.tsx` menu array reordered.
- Copy edits in: `pricing.tsx`, `index.tsx`, `checkout.tsx`, `faq.tsx`, `terms.tsx`, `privacy.tsx`, `nutrition-intelligence.tsx`, `diet-plans.weight-loss.tsx`, `how-it-works.tsx`, `about.tsx`, `_authenticated/plans.tsx`.
