# Fix diet visibility, checkout records, admin inspection, and failure alerts

## Confirmed current state

- The database has **10 generation sessions**, but only **3 sessions contain an actual saved diet plan** (5 saved versions total).
- **2 sessions are unpaid `pending` checkout attempts** and **5 `paid` zero-cost/admin sessions have no generated plan**.
- The customer “My plans” page and the admin “Diet plans” page currently list `generation_sessions`, not actual saved `diet_plans`. This is why checkout attempts and failed generations are presented as plans.
- The admin **Plans = 10** counter counts every generation session. **Credits left** also includes unused credits from sessions that never produced a plan, so both labels are misleading.
- Admin plan rows are static and cannot open the saved plan content.
- Email delivery logs show that the managed email service accepted failure-alert messages to `smartydiet@outlook.com`, including the attempt at **21:15 UTC**, but the code treats dispatch as success without a durable alert record and silently suppresses notification errors. Provider acceptance does not prove inbox delivery.

## Implementation

### 1. Make actual saved diets the source of truth

- Change the customer “My plans” list to show only sessions that have at least one saved row in `diet_plans`.
- Keep all previously generated plans visible, including older versions where `is_final` was never set; select the newest version when no version is marked final.
- Do not show paid-but-failed sessions or checkout attempts as diet plans.
- Refresh the offline mirror/cache from this same actual-plan dataset so stale session-only cards disappear online and previously saved diets remain available offline.

### 2. Stop creating unpaid pending records

- Generate a prospective session ID for checkout metadata, but do **not** insert a `generation_sessions` row when checkout opens.
- Insert/upsert the generation session only after payment is confirmed by the webhook or checkout return flow.
- Make payment confirmation idempotent so webhook and return-page confirmation cannot create duplicates.
- Remove the two existing unpaid `pending` session rows with a database migration. Preserve questionnaire answers; they are not diets and allow a customer to resume without creating admin clutter.
- Add a cleanup safeguard for any legacy unpaid pending sessions that may still exist during rollout.

### 3. Give statuses one clear meaning

- Use `paid` only for a confirmed purchase/complimentary entitlement that has not yet produced its first plan.
- Change the session to `completed` immediately after the first plan is saved successfully.
- Allow refinements for both `paid` and `completed` sessions, while keeping credit/refinement accounting separate from plan status.
- Treat paid sessions with no saved plan as failed/incomplete generation attempts, not as diet plans and not as unpaid pending checkouts.

### 4. Rebuild the admin plan view around real diets

- Replace the misleading **Plans** metric with **Generated diets**, counting distinct sessions that contain saved plan content.
- Make the Generated diets metric clickable and open the Diet plans section.
- Remove **Credits left** from the admin overview; credit/refinement counts will only appear inside a specific generated diet where their meaning is clear.
- List only actual generated diets in the Diet plans section, with member, generation date, duration, number of versions, and refinements remaining.
- Make every diet row clickable and add an admin-authorized detail viewer for the complete generated plan, grocery list, rationale, warnings, and version history.
- Keep purchases/payment attempts in the Payments/Revenue area rather than mixing them into Diet plans.

### 5. Make failure reporting durable and observable

- Add a protected backend `plan_generation_failures` record for every failed attempt before sending email, including user, questionnaire/session, stage, technical reason, occurrence time, and email dispatch state.
- Send the immediate alert to `smartydiet@outlook.com`, record whether dispatch was accepted, suppressed, rejected, or failed, and stop swallowing email errors.
- Use one idempotent failure ID so server and browser fallback paths cannot send duplicate alerts.
- Add an admin **Generation failures** view with unread count, technical details, associated customer, and email status. This guarantees the failure remains visible even if Outlook filters an accepted message.
- Cover server AI errors, timeouts, session-start failures, save failures, payment-confirmation failures, and client request/auth failures without relying on the same failing authenticated call as the only fallback.

## Data and security details

- Apply schema and cleanup changes through a database migration with explicit grants, RLS, and admin-only access for failure records.
- Admin plan-content reads will use an authenticated, server-validated admin function; customer reads remain owner-scoped.
- No unpaid checkout attempt will grant generation access or appear as a diet.

## Verification

- Reproduce an AI-generation failure and verify all three signals: generic customer error + homepage redirect, durable admin failure row, and accepted email dispatch to `smartydiet@outlook.com`.
- Verify a checkout opened and abandoned creates no generation session or admin diet row.
- Verify a successful payment creates one session, a successful generation changes it to completed, and retries/webhooks create no duplicate.
- Verify the customer sees all 3 existing generated diet sessions and none of the 7 session-only records.
- Verify the admin Generated diets count is 3 for current data, is clickable, and each diet opens its complete saved content and versions.
- Verify online/offline customer plan lists and run focused tests plus the platform build check.
