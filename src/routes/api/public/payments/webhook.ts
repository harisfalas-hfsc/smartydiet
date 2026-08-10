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

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function handleCheckoutCompleted(session: any) {
  const genSessionId = session?.metadata?.generationSessionId;
  if (!genSessionId) return;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  await getSupabase()
    .from("generation_sessions")
    .update({ status: "paid", stripe_payment_intent: paymentIntent })
    .eq("id", genSessionId);
}

function priceInfo(subscription: any) {
  const item = subscription.items?.data?.[0];
  return {
    priceId:
      item?.price?.lookup_key ||
      item?.price?.metadata?.lovable_external_id ||
      item?.price?.id ||
      null,
    productId: typeof item?.price?.product === "string" ? item.price.product : null,
    periodStart: item?.current_period_start ?? subscription.current_period_start,
    periodEnd: item?.current_period_end ?? subscription.current_period_end,
  };
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const { priceId, productId, periodStart, periodEnd } = priceInfo(subscription);
  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        provider: "stripe",
        provider_subscription_id: subscription.id,
        provider_customer_id:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null,
        price_id: priceId,
        product_id: productId,
        status: subscription.status,
        current_period_start: isoFromUnix(periodStart),
        current_period_end: isoFromUnix(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_subscription_id" },
    );
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("provider_subscription_id", subscription.id)
    .eq("environment", env);
}

function euro(amount: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amount !== "number") return "your plan";
  const value = (amount / 100).toFixed(2);
  return `${currency?.toUpperCase() === "EUR" ? "€" : `${currency?.toUpperCase() ?? ""} `}${value}`;
}

function pretty(unix: number, withYear = true): string {
  return new Date(unix * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

async function userIdForInvoice(invoice: any, env: StripeEnv): Promise<string | null> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return null;
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id")
    .eq("provider_customer_id", customerId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  if (!invoice.subscription && invoice.billing_reason === "manual") return;
  const userId = await userIdForInvoice(invoice, env);
  if (!userId) return;
  const { notifyOnce } = await import("@/lib/billing-notify.server");
  const amount = euro(invoice.amount_paid ?? invoice.total, invoice.currency);
  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  const nextDate = periodEnd ? pretty(periodEnd) : null;
  await notifyOnce(getSupabase(), {
    userId,
    kind: "billing",
    title: "Thank you — your payment went through",
    body: `We received ${amount} for your SmartyDiet plan.${
      nextDate ? ` Your access is active until ${nextDate}.` : ""
    } Thank you for eating smarter with us — your receipt is on its way by email.`,
    dedupeKey: `invoice-paid:${invoice.id}`,
  });
}

async function handleInvoiceFailed(invoice: any, env: StripeEnv) {
  const userId = await userIdForInvoice(invoice, env);
  if (!userId) return;
  const { notifyOnce } = await import("@/lib/billing-notify.server");
  const attempt = Number(invoice.attempt_count ?? 1);
  const amount = euro(invoice.amount_due ?? invoice.total, invoice.currency);
  const nextAttempt = invoice.next_payment_attempt
    ? pretty(invoice.next_payment_attempt, false)
    : null;
  const body = nextAttempt
    ? `We couldn't take ${amount} for your SmartyDiet plan (attempt ${attempt}). This usually means the card expired, has insufficient funds, or the bank asked for confirmation. We'll try again automatically on ${nextAttempt}. To sort it out now — or to pay with a different card — open My plans and update your payment method. Your access stays on in the meantime.`
    : `We couldn't take ${amount} for your SmartyDiet plan (attempt ${attempt}). This was the last automatic attempt, so your plan will pause unless the payment is completed. Open My plans to update your card and restart it — none of your questionnaires or diet plans are lost.`;
  await notifyOnce(getSupabase(), {
    userId,
    kind: "billing",
    title: nextAttempt ? "Payment didn't go through" : "Payment failed — action needed",
    body,
    dedupeKey: `invoice-failed:${invoice.id}:${attempt}`,
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "transaction.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event.data.object, env);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object, env);
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
