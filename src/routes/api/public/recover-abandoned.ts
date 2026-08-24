import { createFileRoute } from "@tanstack/react-router";

/**
 * Abandoned-checkout recovery.
 *
 * Called by a scheduler (e.g. pg_cron / any external cron) with
 * `Authorization: Bearer <CRON_SECRET>`. Finds members who started or
 * finished the questionnaire but never paid, and sends ONE reminder email per
 * person per questionnaire per stage. Everything is logged in
 * `recovery_emails`, so a reminder can never be sent twice.
 */
export const Route = createFileRoute("/api/public/recover-abandoned")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});

const MIN_AGE_HOURS = 2;
const MAX_AGE_DAYS = 7;

async function run(request: Request): Promise<Response> {
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";
  if (!provided) return json({ error: "unauthorized" }, 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Accepted callers: the CRON_SECRET env value, or the private scheduler
  // token used by the database's own daily job.
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
  const { safeSend } = await import("@/lib/support-email.server");

  const now = Date.now();
  const notAfter = new Date(now - MIN_AGE_HOURS * 3600_000).toISOString();
  const notBefore = new Date(now - MAX_AGE_DAYS * 86400_000).toISOString();

  const { data: candidates, error } = await supabaseAdmin
    .from("questionnaires")
    .select("id, user_id, status, updated_at")
    .in("status", ["draft", "submitted"])
    .lt("updated_at", notAfter)
    .gt("updated_at", notBefore)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  let skipped = 0;

  for (const q of candidates ?? []) {
    const stage = q.status === "submitted" ? "checkout" : "questionnaire";

    // Already reminded for this stage?
    const { data: logged } = await supabaseAdmin
      .from("recovery_emails")
      .select("id")
      .eq("user_id", q.user_id)
      .eq("questionnaire_id", q.id)
      .eq("stage", stage)
      .maybeSingle();
    if (logged) {
      skipped++;
      continue;
    }

    // Never nudge someone who already bought anything.
    const { data: paid } = await supabaseAdmin
      .from("generation_sessions")
      .select("id")
      .eq("user_id", q.user_id)
      .eq("status", "paid")
      .limit(1);
    if (paid && paid.length > 0) {
      skipped++;
      continue;
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(q.user_id);
    const email = authUser?.user?.email;
    if (!email) {
      skipped++;
      continue;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", q.user_id)
      .maybeSingle();

    await safeSend({
      templateName: "abandoned-checkout" as never,
      recipientEmail: email,
      idempotencyKey: `recovery:${q.id}:${stage}`,
      templateData: {
        name: profile?.display_name ?? undefined,
        stage,
        resumeUrl:
          stage === "checkout"
            ? `https://smartydiet.com/checkout?qid=${q.id}`
            : "https://smartydiet.com/questionnaire",
      },
    });

    await supabaseAdmin
      .from("recovery_emails")
      .insert({ user_id: q.user_id, questionnaire_id: q.id, stage });

    sent++;
  }

  return json({ ok: true, considered: candidates?.length ?? 0, sent, skipped });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
