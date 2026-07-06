## Goal

1. Add a hamburger menu on the LEFT of the logo in the header (mobile + desktop) that opens a drawer with public navigation links.
2. Create new public pages: About, Pricing, Contact, Tools hub + 3 tools (BMR Calculator, Macro Calculator, Calorie Counter).
3. Port the 3 calculators from SmartyGym, rewritten to SmartyDiet's TanStack Start + SmartyDiet branding/design tokens.

## Header changes (`src/components/Navigation.tsx`)

- Add a `Menu` (lucide) icon `Button variant="ghost"` on the LEFT of the logo that opens a `Sheet` (side="left") from shadcn.
- Sheet contents (public — visible signed-in or not):
  - Home `/`
  - How it works `/how-it-works`
  - Tools `/tools`
  - Pricing `/pricing`
  - About `/about`
  - Contact `/contact`
  - FAQ `/faq`
- Sheet auto-closes on nav (control `open` state, close on Link click).
- Keep existing right-side user dropdown / Sign in button unchanged.

## New route files (all public, under `src/routes/`)

Each route: `createFileRoute` with `head()` providing route-specific title, description, og:title, og:description.

- `about.tsx` — story of SmartyDiet, mission, science-based approach, part of Smarty family. Simple typographic layout using existing design tokens (no new colors). Includes CTA button to `/questionnaire`.
- `pricing.tsx` — reuse the pricing card block currently on the homepage ($4.99 one-time, INCLUDES list, CTA). Extract into a self-contained page. Homepage keeps its own pricing block (unchanged).
- `contact.tsx` — envelope icon (`Mail` from lucide) hero, mailto link to a support email (placeholder `support@smartydiet.com` — will confirm below), plus a simple non-functional message form OR just the email CTA. Uses same card + primary token styling as rest of app.
- `tools.tsx` — "SmartyDiet Tools" hub: 3 cards linking to the 3 tools with short descriptions and icons (`Flame`, `PieChart`, `Calculator`).
- `tools.bmr-calculator.tsx` — BMR Calculator.
- `tools.macro-calculator.tsx` — Macro Calculator.
- `tools.calorie-counter.tsx` — Calorie Counter.

## Tools implementation

Port logic (formulas, inputs, activity multipliers, result display) from SmartyGym's `BMRCalculator.tsx`, `MacroTrackingCalculator.tsx`, `CalorieCounter.tsx`. Rewrite as:

- Pure client React components using shadcn `Card`, `Input`, `Label`, `Select`, `Button` already in this project.
- SmartyDiet design tokens only (`bg-card`, `text-foreground`, `text-primary`, `border-border`) — no hard-coded colors, no SmartyGym-specific classes.
- Same visual structure/layout as SmartyGym (form on top, big result panel below, explanation text), but restyled to match SmartyDiet.
- No Supabase save button (SmartyGym has save-to-history; SmartyDiet tools stay stateless/public for now).
- Metric units only (kg/cm) to match SmartyDiet audience; unit toggle can be added later.
- Include short educational blurb per tool.

## Homepage pricing block

Leave in place — a duplicate on `/pricing` is expected. No content trimming beyond what's already done.

## Verification

- `bunx tsgo --noEmit`
- Playwright smoke: open `/`, click hamburger, verify links; visit `/about`, `/pricing`, `/contact`, `/tools`, and each `/tools/*` route; run BMR calc with sample inputs and screenshot the result.

## Open question

- Contact email address to use? Default to `support@smartydiet.com` unless you say otherwise. Confirm or provide the address before implementation.
