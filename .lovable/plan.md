# Reliable post-payment diet generation

## Goal
Make an authorized SmartyDiet checkout reliably produce and deliver a diet, remove stale cross-account recovery, and replace the full-screen spinner with the requested inset processing announcement and rotating tips.

## Changes
1. **Start generation from the payment webhook**
   - After Stripe confirms checkout authorization, have the authenticated return flow and the Stripe webhook invoke one idempotent generation job.
   - Use the existing stable generation session ID as the operation ID so duplicate webhook/browser calls cannot create duplicate plans or charges.
   - Keep capture after successful plan persistence; release the authorization and record/alert the failure when generation cannot complete.

2. **Make recovery accurate and account-safe**
   - Remove the global forced redirect behavior that produced the “continue” loop.
   - Only resume active `authorized`/`completed` sessions for the currently verified online Supabase user; never use an offline cached identity to initiate payment recovery.
   - Clear stale offline identity when Supabase confirms there is no live session, while retaining explicit credential-based offline login support.
   - Exclude canceled, released, failed, and already-delivered sessions from recovery.

3. **Replace the loading page with an inset announcement**
   - Show a centered card/modal with visible space around all sides, clear “Please be patient” messaging, “Do not close this window,” progress, and rotating nutrition/process tips.
   - No generic spinner-only screen and no “Continue” recovery toast/button.
   - If the customer navigates away or closes the tab, webhook-started server processing continues; My Plans will refresh/poll while a plan is being built and show it when ready.

4. **Verify payment branding and states**
   - Keep the per-payment `SMARTYDIET` descriptor and confirm the connected live Stripe account is branded SMARTY DIET / smartydiet.com.
   - Verify recent failed attempts remain canceled with €0 captured and test the idempotent authorize → generate → persist → capture sequence.

## Technical notes
- Add a private server generation entry point callable by the verified Stripe webhook, sharing the same generation implementation as the authenticated server function.
- Add status polling/cache refresh to My Plans for active generation sessions.
- Preserve all existing questionnaire and diet-generation rules; only the handoff, recovery, and processing presentation change.
