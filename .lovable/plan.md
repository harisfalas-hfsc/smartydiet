# Authorize first, charge only after the diet is delivered

Same flow for the customer: questionnaire → checkout → plan. The difference is invisible to them — at checkout the card is only **authorized** (money held, not taken). The charge is captured only after the diet plan is fully generated and saved. If generation fails for any reason (no AI balance, system error, timeout), the hold is released immediately and the customer is never charged.

## Customer experience

1. Customer completes the questionnaire and enters checkout as today (€9.99).
2. Card is authorized — the bank places a temporary hold, no money moves.
3. The plan is generated (up to ~2 minutes, existing progress screen).
4. Plan succeeds → card is charged, plan opens in their account like normal.
5. Plan fails → hold is released, they see the standard error message and go back to the homepage, and you get the failure alert email as today. Never charged.

## Safety net

If the plan succeeds but the capture call itself fails (rare Stripe/network issue), the diet is still delivered to the customer and the attempt is flagged in the admin panel as "Delivered — payment not captured", with an alert email to smartydiet@outlook.com, so you can capture or follow up manually. We never withhold a generated diet from a paying customer.

Authorizations expire after ~7 days if never captured; nothing needs manual cleanup for failed generations because we release the hold right away.

## Admin panel

The Attempts tab gains the new outcomes so you can always tell money apart from delivery:
- Authorized — generating
- Authorized — released (generation failed, no charge)
- Paid — delivered (normal success)
- Delivered — payment not captured (needs your attention)

## Technical changes

- `src/lib/payments.functions.ts` — `createDietCheckout`: add `payment_intent_data.capture_method: "manual"`. `markSessionPaid` becomes `markSessionAuthorized`: treat `payment_status: "unpaid"` with an authorized PaymentIntent (`requires_capture`) as valid, create the `generation_sessions` row with status `authorized`, mark the attempt `authorized` / "Payment authorized".
- New server functions in `src/lib/payments.functions.ts`:
  - `captureDietPayment({ generationSessionId })` — verifies the session belongs to the caller and a final plan exists, then `stripe.paymentIntents.capture`, sets session status `paid`, attempt `paid` + `completed_at`, questionnaire `paid`.
  - `releaseDietAuthorization({ generationSessionId, reason })` — `stripe.paymentIntents.cancel`, attempt status `authorization_released` with the failure kind/reason already produced by `attempt-outcomes.ts`.
- `src/routes/checkout/return.tsx` — after generation resolves: success → `captureDietPayment` then navigate to the plan (on capture error, still navigate to the plan and report the "not captured" alert); failure/timeout/throw → `releaseDietAuthorization`, existing `reportPlanGenerationFailure`, redirect to `/`.
- `src/routes/api/public/payments/webhook.ts` — `checkout.session.completed` (async payment / no-JS fallback) records `authorized` instead of `paid`; add `payment_intent.canceled` → `authorization_released` and `payment_intent.succeeded` → `paid` so webhook and client agree. Decline/expiry handling unchanged.
- `src/lib/attempt-outcomes.ts` + `src/components/admin/AdminPlansTab.tsx` — add labels for `authorized`, `authorization_released`, `capture_failed`.
- `src/lib/plan-generation-alert.server.ts` — include the payment state ("hold released, customer not charged" vs "captured") in the alert email body; add the capture-failed alert.
- Free-access mode and admin complimentary generation paths bypass checkout entirely and stay unchanged.

## Verification

Sandbox run with test card 4242…: confirm the PaymentIntent sits in `requires_capture` while generating, becomes `succeeded` after the plan is saved, and is `canceled` with no charge when generation is forced to fail.
