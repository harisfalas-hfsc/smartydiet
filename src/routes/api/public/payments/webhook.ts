import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const genSessionId = session?.metadata?.generationSessionId;
  const userId = session?.metadata?.userId;
  const questionnaireId = session?.metadata?.questionnaireId;
  const durationWeeks = Number(session?.metadata?.durationWeeks);
  if (!genSessionId || !userId || !questionnaireId || ![1, 2, 4].includes(durationWeeks)) return;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const { data: existing } = await getSupabase()
    .from("generation_sessions")
    .select("status")
    .eq("id", genSessionId)
    .maybeSingle();
  const terminalStatuses = new Set([
    "paid",
    "completed",
    "failed",
    "refunded",
    "authorization_released",
  ]);
  const nextStatus = terminalStatuses.has(existing?.status) ? existing.status : "authorized";
  await getSupabase()
    .from("generation_sessions")
    .upsert({
      id: genSessionId,
      user_id: userId,
      questionnaire_id: questionnaireId,
      duration_weeks: durationWeeks,
      status: nextStatus,
      stripe_session_id: session.id,
      stripe_payment_intent: paymentIntent,
      amount_cents: session.amount_total ?? 999,
      currency: session.currency ?? "eur",
    }, { onConflict: "id" });
  await getSupabase()
    .from("questionnaires")
    .update({ status: "paid" })
    .eq("id", questionnaireId)
    .eq("user_id", userId);
  await getSupabase()
    .from("diet_plan_attempts")
    .update({
      status: "authorized",
      reached_stage: "Payment authorized",
      generation_session_id: genSessionId,
      stripe_payment_intent: paymentIntent,
    })
    .eq("stripe_session_id", session.id)
    .in("status", ["checkout_opened", "payment_processing", "authorized"]);
}

async function handlePaymentIntentSettled(intent: any, captured: boolean) {
  if (!intent?.id) return;
  if (captured) {
    await getSupabase()
      .from("generation_sessions")
      .update({ status: "paid" })
      .eq("stripe_payment_intent", intent.id);
    await getSupabase()
      .from("diet_plan_attempts")
      .update({ status: "paid", reached_stage: "Payment captured", paid_at: new Date().toISOString() })
      .eq("stripe_payment_intent", intent.id)
      .in("status", ["authorized", "paid"]);
    return;
  }
  await getSupabase()
    .from("generation_sessions")
    .update({ status: "authorization_released" })
    .eq("stripe_payment_intent", intent.id);
  await getSupabase()
    .from("diet_plan_attempts")
    .update({ payment_failure_code: "authorization_released" })
    .eq("stripe_payment_intent", intent.id);
}

async function handleCheckoutFailure(session: any, declined: boolean) {
  const paymentCode = session?.last_payment_error?.decline_code ?? session?.last_payment_error?.code ?? null;
  const failureReason = declined
    ? `Payment was declined${paymentCode ? ` (${paymentCode})` : ""}.`
    : "Checkout expired before payment was completed.";
  const failedAt = new Date().toISOString();
  await getSupabase()
    .from("diet_plan_attempts")
    .update({
      status: declined ? "payment_declined" : "payment_cancelled",
      reached_stage: declined ? "Payment declined" : "Checkout expired",
      failure_stage: "Payment",
      failure_reason: failureReason,
      failure_kind: declined ? "payment_declined" : "checkout_abandoned",
      payment_failure_code: paymentCode,
      failed_at: failedAt,
    })
    .eq("stripe_session_id", session.id);

  if (declined) {
    const { data: attempt } = await getSupabase()
      .from("diet_plan_attempts")
      .select("id,user_id,questionnaire_id,generation_session_id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (attempt) {
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const delivery = await sendTemplateEmail("plan-generation-failure", "smartydiet@outlook.com", {
          idempotencyKey: `payment-declined-${attempt.id}`,
          templateData: {
            userId: attempt.user_id,
            questionnaireId: attempt.questionnaire_id,
            sessionId: attempt.generation_session_id,
            stage: "Payment",
            outcomeLabel: "Payment failed — card declined",
            paymentState: "Card declined",
            reason: failureReason,
            occurredAt: failedAt,
          },
        });
        await getSupabase().from("diet_plan_attempts").update({
          email_status: delivery.sent ? "accepted" : "suppressed",
          email_error: delivery.sent ? null : delivery.reason,
          email_message_id: delivery.sent ? delivery.messageId : null,
          email_recipient: "smartydiet@outlook.com",
          email_dispatched_at: delivery.sent ? new Date().toISOString() : null,
        }).eq("id", attempt.id);
      } catch (error) {
        await getSupabase().from("diet_plan_attempts").update({
          email_status: "failed",
          email_error: error instanceof Error ? error.message.slice(0, 1000) : "Email dispatch failed",
          email_recipient: "smartydiet@outlook.com",
        }).eq("id", attempt.id);
      }
    }
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "transaction.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSettled(event.data.object, true);
      break;
    case "payment_intent.canceled":
      await handlePaymentIntentSettled(event.data.object, false);
      break;
    case "checkout.session.async_payment_failed":
      await handleCheckoutFailure(event.data.object, true);
      break;
    case "checkout.session.expired":
      await handleCheckoutFailure(event.data.object, false);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
