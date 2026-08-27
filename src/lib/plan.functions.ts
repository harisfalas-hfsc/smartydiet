import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runPlanGeneration } from "@/lib/plan-generation.server";

export const saveQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      data: any;
      durationWeeks?: 1 | 2 | 4;
      status?: "draft" | "submitted";
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase.from("questionnaires").upsert(
        {
          id: data.id,
          user_id: userId,
          data: data.data,
          duration_weeks: data.durationWeeks ?? null,
          status: data.status ?? "draft",
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("questionnaires")
      .insert({
        user_id: userId,
        data: data.data,
        duration_weeks: data.durationWeeks ?? null,
        status: data.status ?? "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { sessionId: string; refinement?: string; operationId?: string }) => input,
  )
  .handler(async ({ data, context }) => runPlanGeneration(data, context));

// Fetch all versions for a session
export const listPlanVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("generation_sessions")
      .select("status,stripe_payment_intent")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) return [];
    // Paid plans and genuinely complimentary plans are deliverable. A plan
    // persisted while capture is still being confirmed must remain hidden.
    if (session.stripe_payment_intent && session.status !== "paid") return [];
    const { data: rows, error } = await supabase
      .from("diet_plans")
      .select("id,version,plan,rationale,refinement_note,is_final,created_at")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Restore a previous version as the active (is_final) — does NOT consume a credit
export const restorePlanVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; version: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: target } = await supabase
      .from("diet_plans")
      .select("id")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .eq("version", data.version)
      .maybeSingle();
    if (!target) throw new Error("Version not found");
    await supabase
      .from("diet_plans")
      .update({ is_final: false })
      .eq("session_id", data.sessionId)
      .eq("user_id", userId);
    const { error } = await supabase
      .from("diet_plans")
      .update({ is_final: true })
      .eq("id", target.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
