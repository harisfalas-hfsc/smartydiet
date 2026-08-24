import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountExport = {
  exported_at: string;
  account: { id: string; email: string | null };
  profile: unknown;
  questionnaires: unknown[];
  generation_sessions: unknown[];
  diet_plans: unknown[];
  purchases: unknown[];
  notifications: unknown[];
  support_threads: unknown[];
  support_messages: unknown[];
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
    let messages: unknown[] = [];
    if (threadRows.length) {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .in(
          "thread_id",
          threadRows.map((t: { id: string }) => t.id),
        );
      messages = data ?? [];
    }

    const sessionRows = sessions.data ?? [];

    return {
      exported_at: new Date().toISOString(),
      account: { id: userId, email: (claims?.email as string | undefined) ?? null },
      profile: profile.data ?? null,
      questionnaires: questionnaires.data ?? [],
      generation_sessions: sessionRows,
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
        })),
      notifications: notifications.data ?? [],
      support_threads: threadRows,
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
