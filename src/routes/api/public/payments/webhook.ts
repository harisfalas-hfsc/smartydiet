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
  await getSupabase()
    .from("generation_sessions")
    .upsert({
      id: genSessionId,
      user_id: userId,
      questionnaire_id: questionnaireId,
      duration_weeks: durationWeeks,
      status: "paid",
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
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "transaction.completed":
      await handleCheckoutCompleted(event.data.object);
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
