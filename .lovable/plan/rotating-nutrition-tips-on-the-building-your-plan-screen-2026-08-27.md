# Rotating nutrition tips on the "Building your plan" screen

## Goal
Make the waiting screen in `src/routes/_authenticated/plans.$sessionId.tsx` (the one that shows "Building your plan… this can take up to 2 minutes.") interactive, exactly like the checkout return page: a rotating "Did you know?" nutrition tip that changes every few seconds while the plan is being built.

## Changes

**`src/routes/_authenticated/plans.$sessionId.tsx`**
- Add a `PLAN_TIPS` array of ~12 short nutrition facts/tips (each one line or two, e.g. "Did you know? Protein at breakfast keeps you full longer and reduces cravings.").
- Add a tip rotation: `useState` index + `useEffect` interval (every ~7 seconds) cycling through the tips, same pattern already used in `src/routes/checkout/return.tsx`.
- In the `autoGenerating` empty-state card, render below the spinner and "Building your plan…" text:
  - A "Did you know?" label (small, primary color)
  - The current tip text
  - A note: "Stay on this page — your plan will appear here automatically when it is ready."
- Styling matches the existing card/muted-border look used on the checkout return page (no new colors, semantic tokens only).

No backend, payment, or generation-logic changes. Purely the waiting UI on the plan page.

## Verification
- Build check passes.
- Visually confirm the card shows the spinner, message, rotating tip, and stay-on-page note on mobile viewport.
