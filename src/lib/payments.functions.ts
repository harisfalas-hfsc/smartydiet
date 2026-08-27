import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { loadOwnedPaymentSession, resolveOrCreatePaymentCustomer } from "@/lib/payments.server";

type CheckoutResult = { clientSecret: string } | { error: string };

export const createDietCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      questionnaireId: string;
      durationWeeks: 1 | 2 | 4;
      returnUrl: string;
      environment: StripeEnv;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { readFreeAccessMode, FREE_ACCESS_BLOCK_MESSAGE } =
        await import("@/lib/free-access.server");
      if (await readFreeAccessMode()) return { error: FREE_ACCESS_BLOCK_MESSAGE };
      const { supabase, userId } = context;
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? undefined;

      // Verify questionnaire belongs to user
      const { data: q, error: qErr } = await supabase
        .from("questionnaires")
        .select("id")
        .eq("id", data.questionnaireId)
        .eq("user_id", userId)
        .single();
      if (qErr || !q) return { error: "Questionnaire not found" };

      // Reserve an id for Stripe metadata without creating an unpaid database record.
      const generationSessionId = crypto.randomUUID();

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: ["smartydiet_plan_onetime"] });
      if (!prices.data.length) return { error: "Price not found" };
      const price = prices.data[0];

      const customerId = await resolveOrCreatePaymentCustomer(stripe, { email, userId });

      const productId = typeof price.product === "string" ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);

      const checkout = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: {
          description: product.name,
          capture_method: "manual",
          statement_descriptor_suffix: "SMARTYDIET",
          metadata: { userId, generationSessionId },
        },
        metadata: {
          userId,
          generationSessionId,
          questionnaireId: data.questionnaireId,
          durationWeeks: String(data.durationWeeks),
        },
      });

      const { error: attemptError } = await supabase.from("diet_plan_attempts").insert({
        user_id: userId,
        questionnaire_id: data.questionnaireId,
        stripe_session_id: checkout.id,
        environment: data.environment,
        status: "checkout_opened",
        reached_stage: "Checkout opened",
        amount_cents: price.unit_amount ?? 999,
        currency: price.currency ?? "eur",
      });
      if (attemptError) {
        await stripe.checkout.sessions.expire(checkout.id).catch(() => undefined);
        return { error: `Checkout attempt could not be recorded: ${attemptError.message}` };
      }
      return { clientSecret: checkout.client_secret ?? "" };
    } catch (err) {
      return { error: getStripeErrorMessage(err) };
    }
  });

// Confirm the card authorization (manual capture) and create the generation session.
// The customer is NOT charged here — capture happens only after the plan is generated.
export const markSessionAuthorized = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stripeSessionId: string; environment: StripeEnv }) => input)
  .handler(async ({ data, context }) => {
    try {
      const { readFreeAccessMode, FREE_ACCESS_BLOCK_MESSAGE } =
        await import("@/lib/free-access.server");
      if (await readFreeAccessMode()) return { paid: false, error: FREE_ACCESS_BLOCK_MESSAGE };
      const stripe = createStripeClient(data.environment);
      const cs = await stripe.checkout.sessions.retrieve(data.stripeSessionId, {
        expand: ["payment_intent"],
      });
      const pi = typeof cs.payment_intent === "string" ? null : cs.payment_intent;
      const authorized =
        cs.payment_status === "paid" ||
        pi?.status === "requires_capture" ||
        pi?.status === "succeeded";
      if (!authorized) {
        const paymentError = pi?.last_payment_error;
        const declineReason = paymentError?.decline_code ?? paymentError?.code;
        if (pi?.status === "requires_payment_method") {
          return {
            paid: false,
            error: declineReason
              ? `Your card was declined (${declineReason}). Please use another payment method.`
              : "Your card was declined. Please use another payment method.",
          };
        }
        if (cs.status === "expired") {
          return { paid: false, error: "This checkout expired. Your card was not charged." };
        }
        return { paid: false };
      }
      const { supabase, userId } = context;
      const genSessionId = cs.metadata?.generationSessionId;
      const questionnaireId = cs.metadata?.questionnaireId;
      const durationWeeks = Number(cs.metadata?.durationWeeks);
      if (!genSessionId || !questionnaireId || ![1, 2, 4].includes(durationWeeks)) {
        return { paid: false, error: "Checkout metadata is incomplete" };
      }
      const { data: questionnaire } = await supabase
        .from("questionnaires")
        .select("id")
        .eq("id", questionnaireId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!questionnaire || cs.metadata?.userId !== userId) {
        return { paid: false, error: "Checkout does not belong to this account" };
      }
      const paymentIntent =
        typeof cs.payment_intent === "string" ? cs.payment_intent : (cs.payment_intent?.id ?? null);
      const sessionPayload = {
        id: genSessionId,
        user_id: userId,
        questionnaire_id: questionnaireId,
        duration_weeks: durationWeeks,
        // This function only confirms permission to generate. The app marks
        // the session paid after the plan row exists and capture succeeds.
        status: "authorized",
        stripe_session_id: cs.id,
        stripe_payment_intent: paymentIntent,
        amount_cents: cs.amount_total ?? 999,
        currency: cs.currency ?? "eur",
      };
      const { error: insertError } = await supabase
        .from("generation_sessions")
        .insert(sessionPayload);
      if (insertError?.code === "23505") {
        const { error: updateError } = await supabase
          .from("generation_sessions")
          .update(sessionPayload)
          .eq("id", genSessionId)
          .eq("user_id", userId)
          .in("status", ["pending", "authorized", "failed"]);
        if (updateError) return { paid: false, error: updateError.message };
      } else if (insertError) {
        return { paid: false, error: insertError.message };
      }
      await supabase
        .from("diet_plan_attempts")
        .update({
          status: "authorized",
          reached_stage: "Payment authorized",
          generation_session_id: genSessionId,
          stripe_payment_intent: paymentIntent,
        })
        .eq("stripe_session_id", cs.id)
        .in("status", ["checkout_opened", "payment_processing", "authorized"]);
      await supabase
        .from("questionnaires")
        .update({ status: "paid" })
        .eq("id", questionnaireId)
        .eq("user_id", userId);
      return { paid: true, generationSessionId: genSessionId };
    } catch (err) {
      return { paid: false, error: getStripeErrorMessage(err) };
    }
  });

// Return an unfinished paid flow so navigation can resume it instead of
// starting another questionnaire and another checkout.
export const getResumableDietSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sessions, error } = await supabase
      .from("generation_sessions")
      .select("id,stripe_session_id,status,created_at")
      .eq("user_id", userId)
      .in("status", ["authorized", "paid", "completed", "failed"])
      .not("stripe_session_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return { stripeSessionId: null };

    for (const session of sessions ?? []) {
      if (!session.stripe_session_id) continue;
      const { data: plan } = await supabase
        .from("diet_plans")
        .select("id")
        .eq("session_id", session.id)
        .limit(1)
        .maybeSingle();
      if (session.status === "paid" && plan) continue;
      // Both cases need the return route: no plan resumes generation, while
      // an existing plan resumes the interrupted payment capture.
      return {
        stripeSessionId: session.stripe_session_id,
        generationSessionId: session.id,
        hasPlan: Boolean(plan),
      };
    }
    return { stripeSessionId: null };
  });

// Capture the authorized payment — called only after the diet plan exists.
export const captureDietPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationSessionId: string; environment: StripeEnv }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      const session = await loadOwnedPaymentSession(supabase, userId, data.generationSessionId);
      if (!session) return { captured: false, error: "Session not found" };
      if (session.status === "paid") return { captured: true };
      if (session.status === "authorization_released") {
        return {
          captured: false,
          released: true,
          error: "The card authorization was released. You were not charged.",
        };
      }
      if (!session.stripe_payment_intent) {
        return { captured: false, error: "No payment to capture" };
      }
      const { data: plan } = await supabase
        .from("diet_plans")
        .select("id")
        .eq("session_id", data.generationSessionId)
        .limit(1)
        .maybeSingle();
      if (!plan) return { captured: false, error: "No plan generated — refusing to charge" };

      const stripe = createStripeClient(data.environment);
      const intent = await stripe.paymentIntents.retrieve(session.stripe_payment_intent);
      if (intent.metadata?.userId && intent.metadata.userId !== userId) {
        return { captured: false, error: "Payment does not belong to this account" };
      }
      if (intent.status === "requires_capture") {
        await stripe.paymentIntents.capture(
          session.stripe_payment_intent,
          {},
          { idempotencyKey: `capture-diet-${data.generationSessionId}` },
        );
      } else if (intent.status === "canceled") {
        await supabase
          .from("generation_sessions")
          .update({ status: "authorization_released" })
          .eq("id", data.generationSessionId);
        return {
          captured: false,
          released: true,
          error: "The card authorization was released. You were not charged.",
        };
      } else if (intent.status !== "succeeded") {
        throw new Error(`Payment is in state ${intent.status} and cannot be captured`);
      }
      const now = new Date().toISOString();
      await supabase
        .from("generation_sessions")
        .update({ status: "paid" })
        .eq("id", data.generationSessionId);
      await supabase
        .from("diet_plan_attempts")
        .update({
          status: "generated",
          reached_stage: "Plan delivered",
          paid_at: now,
          completed_at: now,
        })
        .eq("generation_session_id", data.generationSessionId);
      return { captured: true };
    } catch (err) {
      const message = getStripeErrorMessage(err);
      let authorizationReleased = false;
      try {
        const session = await loadOwnedPaymentSession(supabase, userId, data.generationSessionId);
        if (session?.stripe_payment_intent) {
          const stripe = createStripeClient(data.environment);
          const intent = await stripe.paymentIntents.retrieve(session.stripe_payment_intent);
          if (intent.status === "succeeded") {
            const now = new Date().toISOString();
            await supabase
              .from("generation_sessions")
              .update({ status: "paid" })
              .eq("id", data.generationSessionId);
            await supabase
              .from("diet_plan_attempts")
              .update({
                status: "generated",
                reached_stage: "Plan delivered",
                paid_at: now,
                completed_at: now,
              })
              .eq("generation_session_id", data.generationSessionId);
            return { captured: true };
          }
          if (intent.status === "requires_capture" || intent.status === "requires_confirmation") {
            await stripe.paymentIntents.cancel(
              session.stripe_payment_intent,
              {},
              { idempotencyKey: `capture-failed-release-${data.generationSessionId}` },
            );
            authorizationReleased = true;
            await supabase
              .from("generation_sessions")
              .update({ status: "authorization_released" })
              .eq("id", data.generationSessionId);
          }
        }
      } catch {
        // The support alert below records the unresolved payment state.
      }
      await supabase
        .from("diet_plan_attempts")
        .update({
          status: authorizationReleased ? "authorization_released" : "capture_failed",
          reached_stage: authorizationReleased
            ? "Plan delivered — authorization released"
            : "Plan delivered — payment not captured",
          failure_stage: "Payment capture",
          failure_reason: message.slice(0, 4000),
          failure_kind: "capture_failed",
          payment_failure_code: authorizationReleased ? "authorization_released" : null,
          failed_at: new Date().toISOString(),
        })
        .eq("generation_session_id", data.generationSessionId);
      try {
        const { sendCapturePaymentAlert } = await import("@/lib/plan-generation-alert.server");
        await sendCapturePaymentAlert(
          { supabase, userId, claims: context.claims as Record<string, unknown> },
          { sessionId: data.generationSessionId, reason: message },
        );
      } catch {
        // alerting must never block plan delivery
      }
      return { captured: false, error: message };
    }
  });

// Release the hold when generation failed — the customer is never charged.
export const releaseDietAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { generationSessionId: string; environment: StripeEnv; reason?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      const session = await loadOwnedPaymentSession(supabase, userId, data.generationSessionId);
      if (!session?.stripe_payment_intent)
        return { released: false, error: "No authorization to release" };
      const stripe = createStripeClient(data.environment);
      const intent = await stripe.paymentIntents.retrieve(session.stripe_payment_intent);
      if (intent.metadata?.userId && intent.metadata.userId !== userId) {
        return { released: false, error: "Payment does not belong to this account" };
      }
      if (intent.status === "requires_capture" || intent.status === "requires_confirmation") {
        await stripe.paymentIntents.cancel(
          session.stripe_payment_intent,
          {},
          { idempotencyKey: `release-diet-${data.generationSessionId}` },
        );
      } else if (intent.status !== "canceled") {
        return { released: false, error: `Payment is in state ${intent.status}` };
      }
      await supabase
        .from("generation_sessions")
        .update({ status: "authorization_released" })
        .eq("id", data.generationSessionId);
      await supabase
        .from("diet_plan_attempts")
        .update({
          payment_failure_code: "authorization_released",
        })
        .eq("generation_session_id", data.generationSessionId);
      return { released: true };
    } catch (err) {
      return { released: false, error: getStripeErrorMessage(err) };
    }
  });
