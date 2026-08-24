import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { Json } from "@/integrations/supabase/types";

export type AccountExport = {
  exported_at: string;
  account: { id: string; email: string | null };
  profile: Json | null;
  questionnaires: Json[];
  generation_sessions: Json[];
  diet_plans: Json[];
  purchases: Json[];
  notifications: Json[];
  support_threads: Json[];
  support_messages: Json[];
};

/** Right to Data Portability: returns every row belonging to the caller. */
export const exportMyAccountData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountExport> => {
    const { supabase, userId, claims } = context;

    const [profile, questionnaires, sessions, plans, notifications, threads] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("questionnaires").select("*").eq("user_id", userId),
      supabase.from("generation_sessions").select("*").eq("user_id", userId),
      supabase.from("diet_plans").select("*").eq("user_id", userId),
      supabase.from("notifications").select("*").eq("user_id", userId),
      supabase.from("support_threads").select("*").eq("user_id", userId),
    ]);

    const threadRows = threads.data ?? [];
    let messages: Json[] = [];
    if (threadRows.length) {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .in(
          "thread_id",
          threadRows.map((t: { id: string }) => t.id),
        );
      messages = (data ?? []) as Json[];
    }

    const sessionRows = sessions.data ?? [];

    return {
      exported_at: new Date().toISOString(),
      account: { id: userId, email: (claims?.email as string | undefined) ?? null },
      profile: (profile.data ?? null) as Json | null,
      questionnaires: (questionnaires.data ?? []) as Json[],
      generation_sessions: sessionRows as Json[],
      diet_plans: plans.data ?? [],
      // Purchase history is the payment side of each generation session.
      purchases: sessionRows
        .filter((s: { stripe_session_id?: string | null }) => !!s.stripe_session_id)
        .map((s: Record<string, unknown>) => ({
          session_id: s['id'],
          amount_cents: s['amount_cents'],
          currency: s['currency'],
          status: s['status'],
          stripe_session_id: s['stripe_session_id'],
          stripe_payment_intent: s['stripe_payment_intent'],
          created_at: s['created_at'],
        })) as Json[],
      notifications: (notifications.data ?? []) as Json[],
      support_threads: threadRows as Json[],
      support_messages: messages,
    };
  });

/** Right to Erasure: permanently removes the caller's account and all their data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: threads } = await supabaseAdmin
      .from("support_threads")
      .select("id")
      .eq("user_id", userId);
    const threadIds = (threads ?? []).map((t: { id: string }) => t.id);
    if (threadIds.length) {
      await supabaseAdmin.from("support_messages").delete().in("thread_id", threadIds);
    }

    await supabaseAdmin.from("diet_plans").delete().eq("user_id", userId);
    await supabaseAdmin.from("generation_sessions").delete().eq("user_id", userId);
    await supabaseAdmin.from("questionnaires").delete().eq("user_id", userId);
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("support_threads").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };
    return { ok: true };
  });
