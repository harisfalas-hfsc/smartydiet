# Failure alerts: what actually happened, and the emails to add

## Why you did not see an alert for Marilena

The alert system did fire. Checked against the real records:

- Five failure records exist for her session, all `Payment Required (status 402)` (AI balance), from 30 Aug 18:55 to 21:55 UTC.
- Each one is recorded as `email_status: accepted`, recipient `smartydiet@outlook.com`, with no error.
- The delivery log confirms five separate `sent` events to `smartydiet@outlook.com` on 30 Aug (18:55, 19:00, 19:15, 19:50, 21:55). No bounce, no complaint, no suppression.
- The retry cron also ran correctly — every 5 minutes, and it is what produced those repeated attempts and alerts.

So: the code worked, the cron worked, the mail was accepted and sent from `noreply@notify.smartydiet.com`. The mail did not fail — it did not reach your eye. With Outlook that means Junk / Other / a rule. Nothing in the app can prove inbox placement; only the mailbox can.

Two real gaps remain, and they are the reason it felt silent:

1. **No "we gave up" alert.** After 5 attempts the session stops retrying and goes quiet forever. The last alert looks identical to the first four, so there is no signal that says "this one is now stuck and needs you". Marilena's plan sat unbuilt until you asked about it.
2. **The customer is told nothing.** No apology email on failure, no email when the plan is finally delivered after a recovery.

## What will be built

### 1. Deliverability of the admin alert
- Add a second admin recipient option so alerts also go to a non-Outlook address (you give the address; if you prefer to keep only Outlook, we skip this).
- Make the subject unmistakable and prefixed, e.g. `[SmartyDiet ALERT] Paid plan failed — <customer>`, so an Outlook rule can pin it to the inbox.
- Set reply-to to the support address so replies work.

### 2. New "generation abandoned" escalation alert
- When a session reaches the final attempt (attempt 5) and stops retrying, send a distinct, higher-urgency admin email: `[SmartyDiet URGENT] Paid plan STUCK after 5 attempts` with the customer's name/email, session id, the reason, and a direct link to the admin view.
- Recorded in the failure table with its own stage so it is never merged with a routine attempt.

### 3. Customer email on failure (only when something goes wrong)
- Sent once per failed session (not once per retry): "We hit a snag building your plan. Your payment and your answers are safe — we're already working on it and you'll get your plan shortly."
- Branded template, no technical wording, no scary error codes.
- Never sent on the normal happy path.

### 4. Customer email on recovery
- When a previously failed session finally produces a plan, send: "Your plan is ready" with a button to open it.
- Only sent for sessions that had failed earlier. A first-time success stays silent, as today.

### 5. Never lose a stuck plan again
- The daily recovery cron also sweeps sessions that are `generation_failed` with no retry scheduled and no plan, and re-alerts once a day until they are resolved, so a stuck paid customer can never go unnoticed.

## Technical notes

- `src/lib/plan-generation-alert.server.ts`: add `ADMIN_EMAILS` list, subject prefixes, reply-to, and a new `sendPlanAbandonedAlert`.
- `src/lib/plan-generation.server.ts`: in `fail()`, when `attemptCount >= 5` also raise the abandoned alert; on the first failure of a session, send the customer apology email (guarded by a flag column so retries do not re-send).
- New templates `plan-delay-customer.tsx` and `plan-ready-customer.tsx`, registered in `src/lib/email-templates/registry.ts`.
- Success path in `runPlanGeneration`: if the session had `attempt_count > 0`, send the "plan ready" customer email after the plan is saved.
- New sweep handler in `src/routes/api/public/retry-generations.ts` (or the recovery route) for exhausted sessions; no new cron entry needed — the existing schedules cover it.
- Migration: add `customer_notified_at` and `recovery_notified_at` to `generation_sessions` so each customer email is sent exactly once.
