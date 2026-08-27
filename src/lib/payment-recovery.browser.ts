import { supabase } from "@/integrations/supabase/client";

type ResumablePayment = {
  stripeSessionId: string | null;
  generationSessionId?: string;
  hasPlan?: boolean;
};

/**
 * Browser-side recovery deliberately reads through the signed-in database
 * client instead of a server function. This avoids losing a completed card
 * authorization when a freshly returned tab has not attached its bearer token
 * to server-function requests yet.
 */
export async function findResumablePayment(userId: string): Promise<ResumablePayment> {
  const { data: sessions, error } = await supabase
    .from("generation_sessions")
    .select("id,stripe_session_id,status,created_at")
    .eq("user_id", userId)
    .in("status", ["authorized", "paid", "completed", "failed"])
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  for (const session of sessions ?? []) {
    if (!session.stripe_session_id) continue;
    const { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .select("id")
      .eq("session_id", session.id)
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    if (session.status === "paid" && plan) continue;
    return {
      stripeSessionId: session.stripe_session_id,
      generationSessionId: session.id,
      hasPlan: Boolean(plan),
    };
  }

  return { stripeSessionId: null };
}
