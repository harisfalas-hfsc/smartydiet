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

### 2. Track attempts only from checkout and classify the real outcome
- Start an attempt only when checkout is opened. Questionnaire-only activity is never added to Attempts.
- Use explicit, mutually exclusive admin outcomes:
  - **Checkout pending/abandoned** — checkout opened but payment was not completed.
  - **Payment failed — card declined** — the payment provider reports a decline, including its available decline code/reason.
  - **Payment completed — generating** — a short-lived in-progress state only while generation is actually running.
  - **Generation failed — no AI balance** — the AI provider reports exhausted credits, insufficient balance, quota, or billing failure.
  - **Generation failed — technical issue** — the AI provider or application fails for another technical reason; store the actual internal reason for admin diagnosis.
  - **Generated** — payment completed and at least one real diet was saved; this record appears under Generated diets rather than failed Attempts.
- Make every server-side generation failure update the matching checkout attempt before returning an error. Make client timeout/network reporting update the same attempt idempotently, without conflicting duplicate records.
- Never infer a payment failure from a paid session. After payment, failures are classified as **no AI balance** or **technical issue**, with the original provider/system error retained in the admin details.
- Reconcile the known recent Haris Falas plan-less attempts as **Generation failed — no AI balance**, because these are the tests reported during the exhausted AI balance incident. Do not invent causes for other historical records.

### 3. Send the same accurate classification in the admin email
- Keep `smartydiet@outlook.com` as the required recipient.
- Give the email an unambiguous outcome in its subject and body: **Payment failed — card declined**, **Generation failed — no AI balance**, or **Generation failed — technical issue**. Never describe an AI-balance or platform failure as a payment failure.
- Include the customer, checkout/payment state, stage reached, public classification, exact internal reason, session/attempt references, and timestamp.
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
- Confirm questionnaire-only activity creates no attempt, while opening checkout does.
- Verify a card decline shows **Payment failed — card declined** in admin and email.
- Open a known failed Haris attempt and verify it says **Generation failed — no AI balance**, not payment failed or pending.
- Simulate a separate non-billing generation error and verify it shows **Generation failed — technical issue**, with the exact internal reason visible only to admin and in the admin email.
- Trigger a uniquely identified **no AI balance** alert test and verify the database record plus managed-email event; report inbox receipt separately and honestly.
