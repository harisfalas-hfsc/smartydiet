import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const list = await stripe.customers.list({ email: options.email, limit: 1 });
    if (list.data.length) {
      const c = list.data[0];
      if (c.metadata?.userId !== options.userId) {
        await stripe.customers.update(c.id, {
          metadata: { ...c.metadata, userId: options.userId },
        });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

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

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const productId = typeof price.product === "string" ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);

      const checkout = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name, capture_method: "manual" },
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
      if (!authorized) return { paid: false };
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
      const captured = pi?.status === "succeeded" || cs.payment_status === "paid";
      const { error: sessionError } = await supabase.from("generation_sessions").upsert(
        {
          id: genSessionId,
          user_id: userId,
          questionnaire_id: questionnaireId,
          duration_weeks: durationWeeks,
          status: captured ? "paid" : "authorized",
          stripe_session_id: cs.id,
          stripe_payment_intent: paymentIntent,
          amount_cents: cs.amount_total ?? 999,
          currency: cs.currency ?? "eur",
        },
        { onConflict: "id" },
      );
      if (sessionError) return { paid: false, error: sessionError.message };
      await supabase
        .from("diet_plan_attempts")
        .update({
          status: captured ? "paid" : "authorized",
          reached_stage: captured ? "Payment confirmed" : "Payment authorized",
          generation_session_id: genSessionId,
          stripe_payment_intent: paymentIntent,
          ...(captured ? { paid_at: new Date().toISOString() } : {}),
        })
        .eq("stripe_session_id", cs.id);
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

async function loadOwnedSession(supabase: any, userId: string, generationSessionId: string) {
  const { data } = await supabase
    .from("generation_sessions")
    .select("id,user_id,status,stripe_payment_intent,questionnaire_id")
    .eq("id", generationSessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

// Capture the authorized payment — called only after the diet plan exists.
export const captureDietPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationSessionId: string; environment: StripeEnv }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      const session = await loadOwnedSession(supabase, userId, data.generationSessionId);
      if (!session) return { captured: false, error: "Session not found" };
      if (session.status === "paid") return { captured: true };
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
      if (intent.status === "requires_capture") {
        await stripe.paymentIntents.capture(session.stripe_payment_intent);
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
      await supabase
        .from("diet_plan_attempts")
        .update({
          status: "capture_failed",
          reached_stage: "Plan delivered — payment not captured",
          failure_stage: "Payment capture",
          failure_reason: message.slice(0, 4000),
          failure_kind: "capture_failed",
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
      const session = await loadOwnedSession(supabase, userId, data.generationSessionId);
      if (!session?.stripe_payment_intent)
        return { released: false, error: "No authorization to release" };
      const stripe = createStripeClient(data.environment);
      const intent = await stripe.paymentIntents.retrieve(session.stripe_payment_intent);
      if (intent.status === "requires_capture" || intent.status === "requires_confirmation") {
        await stripe.paymentIntents.cancel(session.stripe_payment_intent);
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
