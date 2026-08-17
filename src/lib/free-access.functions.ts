import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin";

/** Public read — used for SSR surfaces that cannot use the browser client. */
export const getFreeAccessMode = createServerFn({ method: "GET" }).handler(async () => {
  const { readFreeAccessMode } = await import("@/lib/free-access.server");
  return { freeAccessMode: await readFreeAccessMode() };
});

/** Admin-only write of the master switch. */
export const adminSetFreeAccessMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => input)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isAdminEmail(email)) {
      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) return { error: "Forbidden: admin access required" };
    }
    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert(
        { setting_key: "free_access_mode", setting_value: data.enabled },
        { onConflict: "setting_key" },
      );
    if (error) return { error: error.message };
    return { ok: true };
  });

/**
 * Free Access Mode only: create a generation session without any payment.
 * Refuses when the mode is OFF, so it can never bypass billing in normal mode.
 */
export const startFreeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { questionnaireId: string; durationWeeks: 1 | 2 | 4 }) => input)
  .handler(async ({ data, context }): Promise<{ sessionId: string } | { error: string }> => {
    const { readFreeAccessMode } = await import("@/lib/free-access.server");
    if (!(await readFreeAccessMode())) return { error: "Free access mode is not enabled" };

    const { supabase, userId } = context;
    const { data: q, error: qErr } = await supabase
      .from("questionnaires")
      .select("id")
      .eq("id", data.questionnaireId)
      .eq("user_id", userId)
      .maybeSingle();
    if (qErr || !q) return { error: "Questionnaire not found" };

    const { data: session, error: sErr } = await supabase
      .from("generation_sessions")
      .insert({
        user_id: userId,
        questionnaire_id: data.questionnaireId,
        duration_weeks: data.durationWeeks,
        status: "paid",
        amount_cents: 0,
      })
      .select("id")
      .single();
    if (sErr || !session) return { error: sErr?.message ?? "Failed to create session" };

    await supabase
      .from("questionnaires")
      .update({ status: "paid" })
      .eq("id", data.questionnaireId)
      .eq("user_id", userId);

    return { sessionId: session.id };
  });
