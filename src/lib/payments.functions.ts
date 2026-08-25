import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

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
      const { readFreeAccessMode, FREE_ACCESS_BLOCK_MESSAGE } = await import(
        "@/lib/free-access.server"
      );
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
        payment_intent_data: { description: product.name },
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
        generation_session_id: generationSessionId,
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

// Mark session paid — used by return page as a fallback in case webhook is delayed
export const markSessionPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stripeSessionId: string; environment: StripeEnv }) => input)
  .handler(async ({ data, context }) => {
    try {
      const { readFreeAccessMode, FREE_ACCESS_BLOCK_MESSAGE } = await import(
        "@/lib/free-access.server"
      );
      if (await readFreeAccessMode()) return { paid: false, error: FREE_ACCESS_BLOCK_MESSAGE };
      const stripe = createStripeClient(data.environment);
      const cs = await stripe.checkout.sessions.retrieve(data.stripeSessionId);
      if (cs.payment_status !== "paid") return { paid: false };
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
        typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id ?? null;
      const { error: sessionError } = await supabase
        .from("generation_sessions")
        .upsert({
          id: genSessionId,
          user_id: userId,
          questionnaire_id: questionnaireId,
          duration_weeks: durationWeeks,
          status: "paid",
          stripe_session_id: cs.id,
          stripe_payment_intent: paymentIntent,
          amount_cents: cs.amount_total ?? 999,
          currency: cs.currency ?? "eur",
        }, { onConflict: "id" });
      if (sessionError) return { paid: false, error: sessionError.message };
      await supabase
        .from("diet_plan_attempts")
        .update({
          status: "paid",
          reached_stage: "Payment confirmed",
          generation_session_id: genSessionId,
          stripe_payment_intent: paymentIntent,
          paid_at: new Date().toISOString(),
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
