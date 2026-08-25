# Fix admin diet review, attempt reasons, and failure-email verification

## Confirmed current state
- The admin generated-diet view prints the saved plan object as raw JSON, while the customer route separately renders weeks, days, meals, ingredients, instructions, nutrition totals, grocery lists, rationale, and PDF controls.
- Five recent Haris Falas sessions are stored as `paid` with no generated plan, no failed timestamp, and no failure reason. That is why the admin UI labels them “Paid — generation pending”; the database never received the failure transition for those runs.
- The alert database contains the manual verification event as `accepted`, but not the earlier generation failures.
- The email service reports that the latest test to `smartydiet@outlook.com` was sent at 21:56 UTC. The sender domain is verified, the recipient is not suppressed, and no rejection or bounce is recorded. “Sent” confirms provider dispatch, not inbox placement.

## Implementation

### 1. Show the real customer diet in both admin entry points
- Extract the customer-facing plan display into one reusable, read-only plan viewer so customer and admin cannot drift apart.
- Use that viewer in:
  - Admin → Members/Customers → Diet plans.
  - Admin → Diet plans → Generated diets.
- Preserve the real presentation: summary/macros, week/day cards, meals, quantities, ingredients, instructions, grocery lists, rationale, disclaimer, warnings, and version selection.
- Add the same **Plan PDF** and **Grocery PDF** actions used by the customer. Admin review remains read-only: no admin refinement or restore action on another customer’s plan.
- Remove every raw JSON block from the admin UI.

### 2. Make attempt status reflect the actual terminal outcome
- Centralize attempt status labels and details into explicit states: checkout open/abandoned, payment declined, payment cancelled/expired, paid and actively generating, generation failed, and generated.
- Make every server-side generation failure update the matching attempt in the same durable failure path before returning an error.
- Make client timeout/network reporting update the same attempt idempotently, without creating conflicting duplicate records.
- Change “Paid — generation pending” so it is shown only for a genuinely active, recent generation. A paid attempt with a recorded generation failure will show **Generation failed**, with the exact stored stage and reason in its dialog.
- Reconcile the known recent Haris Falas plan-less attempts as historical generation failures caused by the confirmed AI service credit/balance outage, while leaving unrelated historical records untouched when their exact cause cannot be proven.

### 3. Make failure alerts auditable rather than merely “accepted”
- Keep `smartydiet@outlook.com` as the required recipient.
- Persist the alert attempt, recipient, provider result/message reference when available, timestamp, and error before the user is redirected.
- Improve the admin failure card/test action to show the exact dispatch result and time instead of silently refreshing.
- Send one new uniquely identifiable verification email after the fix and confirm all three signals separately:
  1. failure row recorded,
  2. provider dispatch recorded,
  3. no bounce, rejection, or suppression.
- Clearly report that inbox receipt is outside the app’s control if Microsoft accepts the message but routes it to Junk/Other/quarantine; do not claim “delivered” when only “sent” is observable.

## Technical details
- Reuse the existing PDF functions so admin downloads are byte-for-byte the same format as customer downloads.
- Keep plan reads admin-authorized on the server and do not weaken customer row-level access.
- Keep server-function files thin by moving shared rendering/status helpers into dedicated modules.
- Add focused tests for attempt state mapping and failure persistence, then verify the admin flows in the signed-in preview on mobile and desktop and check the final build signal.

## Verification
- Open a generated Haris Falas diet from both admin locations and compare it with the customer plan view.
- Download both plan and grocery PDFs from admin.
- Confirm Antonis Georgiou still correctly shows no diets.
- Open a known failed Haris attempt and verify it says **Generation failed — AI service credit/balance unavailable**, not pending.
- Trigger the alert test and verify the database record plus managed-email event; report inbox receipt separately and honestly.
