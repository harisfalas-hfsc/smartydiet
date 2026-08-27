import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeClient } from "@/lib/stripe.server";

export async function resolveOrCreatePaymentCustomer(
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
      const customer = list.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export async function loadOwnedPaymentSession(
  supabase: SupabaseClient,
  userId: string,
  generationSessionId: string,
) {
  const { data } = await supabase
    .from("generation_sessions")
    .select("id,user_id,status,stripe_payment_intent,questionnaire_id")
    .eq("id", generationSessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}