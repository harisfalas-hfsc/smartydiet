import { createFileRoute } from "@tanstack/react-router";

/**
 * Background retry for paid diets that failed to generate.
 *
 * Called by a scheduler with `Authorization: Bearer <CRON_SECRET>` (or the
 * private scheduler token). Every paid session that failed keeps its
 * questionnaire on record and is retried automatically until it succeeds or
 * the attempt budget is exhausted.
 */
export const Route = createFileRoute("/api/public/retry-generations")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});

const MAX_ATTEMPTS = 5;

async function run(request: Request): Promise<Response> {
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";
  if (!provided) return json({ error: "unauthorized" }, 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const envSecret = process.env["CRON_SECRET"] ?? "";
  let allowed = envSecret.length > 0 && provided === envSecret;
  if (!allowed) {
    const { data: row } = await supabaseAdmin
      .from("cron_tokens")
      .select("token")
      .eq("name", "recovery")
      .maybeSingle();
    allowed = Boolean(row?.token) && provided === row!.token;
  }
  if (!allowed) return json({ error: "unauthorized" }, 401);

  const { data: due, error } = await supabaseAdmin
    .from("generation_sessions")
    .select("id,user_id,attempt_count")
    .eq("status", "generation_failed")
    .lt("attempt_count", MAX_ATTEMPTS)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(10);
  if (error) return json({ error: error.message }, 500);

  const { runPlanGeneration } = await import("@/lib/plan-generation.server");
  const results: Array<{ sessionId: string; ok: boolean }> = [];
  for (const session of due ?? []) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(session.user_id);
      // A failed refinement must be retried as a refinement. Without restoring
      // its text, runPlanGeneration sees version 1 and incorrectly treats that
      // old plan as a successful initial-generation retry.
      const { data: failedRefinement } = await supabaseAdmin
        .from("plan_generation_failures")
        .select("refinement")
        .eq("session_id", session.id)
        .not("refinement", "is", null)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const refinement =
        typeof failedRefinement?.refinement === "string" && failedRefinement.refinement.trim()
          ? failedRefinement.refinement.trim()
          : undefined;
      const result = await runPlanGeneration(
        { sessionId: session.id, operationId: crypto.randomUUID(), refinement },
        {
          supabase: supabaseAdmin,
          userId: session.user_id,
          claims: {
            email: authUser?.user?.email,
            user_metadata: authUser?.user?.user_metadata,
          },
        },
      );
      results.push({ sessionId: session.id, ok: !result.error });
    } catch {
      results.push({ sessionId: session.id, ok: false });
    }
  }

  // Safety net: paid sessions that exhausted their retry budget and still have
  // no plan must never go quiet. Escalate once, then re-escalate daily until
  // the plan is delivered.
  let escalated = 0;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: stuck } = await supabaseAdmin
    .from("generation_sessions")
    .select("id,user_id,attempt_count,last_error,questionnaire_id,abandoned_alert_at")
    .eq("status", "generation_failed")
    .gte("attempt_count", MAX_ATTEMPTS)
    .or(`abandoned_alert_at.is.null,abandoned_alert_at.lt.${dayAgo}`)
    .limit(20);
  if (stuck?.length) {
    const { sendPlanAbandonedAlert } = await import("@/lib/plan-generation-alert.server");
    for (const session of stuck) {
      const { data: plans } = await supabaseAdmin
        .from("diet_plans")
        .select("id")
        .eq("session_id", session.id)
        .limit(1);
      // An existing original plan does not resolve a failed refinement. Only
      // skip escalation when the latest failure was initial generation.
      const { data: failedRefinement } = await supabaseAdmin
        .from("plan_generation_failures")
        .select("refinement")
        .eq("session_id", session.id)
        .not("refinement", "is", null)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (plans?.length && !failedRefinement?.refinement) continue;
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(session.user_id);
      await sendPlanAbandonedAlert(
        {
          supabase: supabaseAdmin,
          userId: session.user_id,
          claims: {
            email: authUser?.user?.email,
            user_metadata: authUser?.user?.user_metadata,
          },
        },
        {
          sessionId: session.id,
          questionnaireId: session.questionnaire_id ?? undefined,
          reason: session.last_error ?? "Automatic retries exhausted",
          attemptCount: session.attempt_count ?? MAX_ATTEMPTS,
          repeat: true,
        },
      ).catch(() => undefined);
      escalated += 1;
    }
  }

  return json({ processed: results.length, escalated, results });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
