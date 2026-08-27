# One refine per payment, both versions kept, same waiting screen

Three fixes so refining is simple and predictable.

## 1. One refine per purchase (2 credits total)

Today each purchase gets 3 credits: the first plan uses 1, leaving 2 refinements. New sessions get 2 credits: the original plan (v1) and one refine (v2). After the refine the card shows "Credits 2/2 used" and the refine box disappears with a short note that this plan's refine has been used.

Existing already-paid sessions keep whatever credits they have — nothing is taken away from them.

## 2. Kill the confusing "Restore" / active-version concept

Right now one version is marked "active" and the other must be "restored" — this is what makes it feel like you only have one plan. Replaced with a plain version switcher:

- Both versions are always kept and always openable: "Version 1 — original" and "Version 2 — refined".
- Tapping a version simply shows it (the current "View" behaviour, which today looks like nothing happens because the page doesn't scroll to the plan). Selecting now scrolls to the plan and clearly labels which version is on screen.
- "Restore" button removed entirely, along with the "restoring does not cost a credit" note.
- The page opens on the newest version by default.
- PDF downloads export the version currently being viewed.

## 3. Show the full generation screen while refining

Refining currently only spins the button. It will now show the exact same waiting screen as the first generation: "Building your plan… this can take up to 2 minutes", the rotating "Did you know?" nutrition tips, and the "stay on this page" note — with the previous version still readable below, so the customer never stares at a blank page.

## Technical notes

- `generation_sessions.credits_total` default changed from 3 to 2 via migration (new rows only).
- `src/lib/plan-generation.server.ts`: stop using `is_final` as a single-active flag; the newest version is simply the highest `version`. Keep writing `is_final` on the latest row for backwards compatibility.
- `src/routes/_authenticated/plans.$sessionId.tsx`: remove the Restore button and `restorePlanVersion` usage; rework the versions card into a labelled switcher; reuse the existing `autoGenerating` tips block for the refine flow (set it while `refine()` runs).
- `src/lib/plan.functions.ts`: `restorePlanVersion` left in place but unused by the UI, or removed if nothing else references it.
- `src/routes/_authenticated/plans.tsx`: card copy for credits stays `x/y used`, now reading 2/2 after a refine.
