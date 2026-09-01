import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { classifyGenerationFailure, generationFailureLabel } from "@/lib/attempt-outcomes";

const ADMIN_EMAIL = "smartydiet@outlook.com";
const SUPPORT_REPLY_TO = "support@smartydiet.com";

/**
 * Operational alerts go to the primary inbox and, when configured, to a
 * backup address on a different provider so an Outlook junk rule can never
 * hide a paid-customer failure again.
 */
function adminRecipients(): string[] {
  const backup = (process.env["ALERT_BACKUP_EMAIL"] ?? "").trim();
  const list = [ADMIN_EMAIL];
  if (backup && backup.toLowerCase() !== ADMIN_EMAIL) list.push(backup);
  return list;
}

type AlertDelivery = { sent: boolean; messageId: string | null; reason?: string };

async function sendAdminAlert(
  templateData: Record<string, unknown>,
  idempotencyKey: string,
): Promise<AlertDelivery> {
  let result: AlertDelivery = { sent: false, messageId: null, reason: "no_recipient" };
  for (const [index, recipient] of adminRecipients().entries()) {
    const delivery = await sendTemplateEmail("plan-generation-failure", recipient, {
      idempotencyKey: `${idempotencyKey}-${index}`,
      replyTo: SUPPORT_REPLY_TO,
      templateData,
    });
    if (index === 0) {
      result = delivery.sent
        ? { sent: true, messageId: delivery.messageId }
        : { sent: false, messageId: null, reason: delivery.reason };
    }
  }
  return result;
}

type AlertContext = {
  supabase: any;
  claims?: Record<string, unknown>;
  userId: string;
};

type FailureDetails = {
  sessionId?: string;
  questionnaireId?: string;
  operationId?: string;
  refinement?: string;
  stage?: string;
  reason: string;
  paymentState?: string;
};

function claimString(claims: Record<string, unknown> | undefined, key: string) {
  const value = claims?.[key];
  return typeof value === "string" ? value : undefined;
}

export async function sendPlanGenerationFailureAlert(context: AlertContext, details: FailureDetails) {
  const failureId = details.operationId ?? crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const failureKind = classifyGenerationFailure(details.reason);
  const outcomeLabel = generationFailureLabel(failureKind);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: recordError } = await supabaseAdmin.from("plan_generation_failures").upsert({
    id: failureId,
    user_id: context.userId,
    session_id: details.sessionId ?? null,
    questionnaire_id: details.questionnaireId ?? null,
    stage: details.stage ?? (details.refinement ? "Plan refinement" : "Initial plan generation"),
    reason: details.reason.slice(0, 4000),
    failure_kind: failureKind,
    refinement: details.refinement ?? null,
    email_status: "pending",
    occurred_at: occurredAt,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (recordError) throw new Error(`Could not record generation failure: ${recordError.message}`);

  const attemptUpdate = {
    status: "generation_failed",
    reached_stage: details.stage ?? "Plan generation",
    failure_stage: details.stage ?? "Plan generation",
    failure_reason: details.reason.slice(0, 4000),
    failure_kind: failureKind,
    failed_at: occurredAt,
  };
  if (details.sessionId) {
    const { data: updatedAttempts } = await supabaseAdmin
      .from("diet_plan_attempts")
      .update(attemptUpdate)
      .eq("generation_session_id", details.sessionId)
      .select("id");
    void updatedAttempts;
  }

  try {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const metadata = context.claims?.user_metadata;
    const userMetadata = metadata && typeof metadata === "object"
      ? metadata as Record<string, unknown>
      : undefined;
    const userEmail = claimString(context.claims, "email");
    const userName =
      (typeof profile?.display_name === "string" ? profile.display_name : undefined) ??
      claimString(userMetadata, "full_name") ??
      claimString(userMetadata, "name");
    const referenceId = details.sessionId ?? details.questionnaireId ?? "unknown";

    const delivery = await sendAdminAlert(
      {
        userName,
        userEmail,
        userId: context.userId,
        sessionId: details.sessionId,
        questionnaireId: details.questionnaireId,
        stage: details.stage ?? (details.refinement ? "Plan refinement" : "Initial plan generation"),
        outcomeLabel,
        paymentState: details.paymentState ?? "Card authorization released — customer NOT charged",
        reason: details.reason.slice(0, 4000),
        occurredAt,
      },
      `plan-generation-failure-${referenceId}-${failureId}`,
    );
    await supabaseAdmin.from("plan_generation_failures").update({
      email_status: delivery.sent ? "accepted" : "suppressed",
      email_error: delivery.sent ? null : delivery.reason,
      email_message_id: delivery.sent ? delivery.messageId : null,
      email_recipient: ADMIN_EMAIL,
      email_dispatched_at: delivery.sent ? new Date().toISOString() : null,
    }).eq("id", failureId);
    if (details.sessionId) {
      await supabaseAdmin.from("diet_plan_attempts").update({
        email_status: delivery.sent ? "accepted" : "suppressed",
        email_error: delivery.sent ? null : delivery.reason,
        email_message_id: delivery.sent ? delivery.messageId : null,
        email_recipient: ADMIN_EMAIL,
        email_dispatched_at: delivery.sent ? new Date().toISOString() : null,
      }).eq("generation_session_id", details.sessionId);
    }
    return { failureId, emailStatus: delivery.sent ? "accepted" : "suppressed" };
  } catch (error) {
    console.error("[plan-generation-alert] notification failed", error);
    const message = error instanceof Error ? error.message : "Email dispatch failed";
    await supabaseAdmin.from("plan_generation_failures").update({
      email_status: "failed",
      email_error: message.slice(0, 1000),
    }).eq("id", failureId);
    if (details.sessionId) {
      await supabaseAdmin.from("diet_plan_attempts").update({
        email_status: "failed",
        email_error: message.slice(0, 1000),
        email_recipient: ADMIN_EMAIL,
      }).eq("generation_session_id", details.sessionId);
    }
    return { failureId, emailStatus: "failed", error: message };
  }
}
// Plan was delivered but the authorized payment could not be captured.
export async function sendCapturePaymentAlert(
  context: AlertContext,
  details: { sessionId: string; reason: string },
) {
  const occurredAt = new Date().toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const delivery = await sendAdminAlert(
      {
        userId: context.userId,
        userEmail: claimString(context.claims, "email"),
        sessionId: details.sessionId,
        stage: "Payment capture",
        outcomeLabel: "Diet delivered — payment NOT captured",
        paymentState: "Authorized but not captured — needs manual capture in Stripe",
        reason: details.reason.slice(0, 4000),
        occurredAt,
        urgent: true,
      },
      `capture-failed-${details.sessionId}`,
    );
    await supabaseAdmin.from("diet_plan_attempts").update({
      email_status: delivery.sent ? "accepted" : "suppressed",
      email_error: delivery.sent ? null : delivery.reason,
      email_message_id: delivery.sent ? delivery.messageId : null,
      email_recipient: ADMIN_EMAIL,
      email_dispatched_at: delivery.sent ? new Date().toISOString() : null,
    }).eq("generation_session_id", details.sessionId);
    return { emailStatus: delivery.sent ? "accepted" : "suppressed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email dispatch failed";
    await supabaseAdmin.from("diet_plan_attempts").update({
      email_status: "failed",
      email_error: message.slice(0, 1000),
      email_recipient: ADMIN_EMAIL,
    }).eq("generation_session_id", details.sessionId);
    return { emailStatus: "failed", error: message };
  }
}

/**
 * Escalation: the paid session has exhausted its automatic retry budget and
 * will never retry on its own again. This must never look like a routine
 * attempt alert — a real customer is waiting for a diet they paid for.
 */
export async function sendPlanAbandonedAlert(
  context: AlertContext,
  details: {
    sessionId: string;
    questionnaireId?: string;
    reason: string;
    attemptCount: number;
    repeat?: boolean;
  },
) {
  const occurredAt = new Date().toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Only ever escalate once per session.
  const { data: session } = await supabaseAdmin
    .from("generation_sessions")
    .select("abandoned_alert_at,questionnaire_id")
    .eq("id", details.sessionId)
    .maybeSingle();
  if (session?.abandoned_alert_at && !details.repeat) return { emailStatus: "skipped" as const };

  let userEmail = claimString(context.claims, "email");
  let userName: string | undefined;
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    userEmail = userEmail ?? authUser?.user?.email ?? undefined;
    const meta = authUser?.user?.user_metadata as Record<string, unknown> | undefined;
    userName = claimString(meta, "full_name") ?? claimString(meta, "name");
  } catch {
    /* identity lookup is best-effort */
  }

  try {
    const delivery = await sendAdminAlert(
      {
        userName,
        userEmail,
        userId: context.userId,
        sessionId: details.sessionId,
        questionnaireId: details.questionnaireId ?? session?.questionnaire_id ?? undefined,
        stage: "Generation abandoned — automatic retries exhausted",
        outcomeLabel: `Paid plan STUCK after ${details.attemptCount} attempts`,
        paymentState: "Customer PAID — plan not delivered. Manual action required.",
        reason: details.reason.slice(0, 4000),
        occurredAt,
        urgent: true,
      },
      `plan-abandoned-${details.sessionId}-${occurredAt.slice(0, 10)}`,
    );
    await supabaseAdmin
      .from("generation_sessions")
      .update({ abandoned_alert_at: occurredAt })
      .eq("id", details.sessionId);
    return { emailStatus: delivery.sent ? ("accepted" as const) : ("suppressed" as const) };
  } catch (error) {
    console.error("[plan-generation-alert] abandoned escalation failed", error);
    return { emailStatus: "failed" as const };
  }
}

const SITE_URL = "https://smartydiet.com";

async function customerIdentity(userId: string, claims?: Record<string, unknown>) {
  let email = claimString(claims, "email");
  const metadata = claims?.["user_metadata"] as Record<string, unknown> | undefined;
  let name = claimString(metadata, "full_name") ?? claimString(metadata, "name");
  if (!email || !name) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = email ?? authUser?.user?.email ?? undefined;
      const meta = authUser?.user?.user_metadata as Record<string, unknown> | undefined;
      name = name ?? claimString(meta, "full_name") ?? claimString(meta, "name");
    } catch {
      /* best-effort */
    }
  }
  return { email, name };
}

/**
 * Customer-facing apology, sent at most once per session and only when the
 * flow actually broke. The happy path never triggers it.
 */
export async function sendCustomerDelayEmail(
  context: AlertContext,
  details: { sessionId: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: session } = await supabaseAdmin
    .from("generation_sessions")
    .select("customer_notified_at")
    .eq("id", details.sessionId)
    .maybeSingle();
  if (session?.customer_notified_at) return { sent: false, reason: "already_sent" as const };

  const { email, name } = await customerIdentity(context.userId, context.claims);
  if (!email) return { sent: false, reason: "no_email" as const };

  try {
    const delivery = await sendTemplateEmail("plan-delay-customer", email, {
      idempotencyKey: `plan-delay-${details.sessionId}`,
      replyTo: SUPPORT_REPLY_TO,
      templateData: { name, plansUrl: `${SITE_URL}/plans` },
    });
    await supabaseAdmin
      .from("generation_sessions")
      .update({ customer_notified_at: new Date().toISOString() })
      .eq("id", details.sessionId);
    return { sent: delivery.sent };
  } catch (error) {
    console.error("[plan-generation-alert] customer delay email failed", error);
    return { sent: false, reason: "error" as const };
  }
}

/**
 * Recovery notice, sent only when a previously failed session finally
 * produced a plan.
 */
export async function sendCustomerPlanReadyEmail(
  context: AlertContext,
  details: { sessionId: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: session } = await supabaseAdmin
    .from("generation_sessions")
    .select("recovery_notified_at,customer_notified_at,attempt_count")
    .eq("id", details.sessionId)
    .maybeSingle();
  if (!session) return { sent: false, reason: "no_session" as const };
  if (session.recovery_notified_at) return { sent: false, reason: "already_sent" as const };
  // Only sessions that actually failed earlier get a recovery email.
  if (!session.customer_notified_at && (session.attempt_count ?? 0) === 0) {
    return { sent: false, reason: "no_failure" as const };
  }

  const { email, name } = await customerIdentity(context.userId, context.claims);
  if (!email) return { sent: false, reason: "no_email" as const };

  try {
    const delivery = await sendTemplateEmail("plan-ready-customer", email, {
      idempotencyKey: `plan-ready-${details.sessionId}`,
      replyTo: SUPPORT_REPLY_TO,
      templateData: { name, planUrl: `${SITE_URL}/plans/${details.sessionId}` },
    });
    await supabaseAdmin
      .from("generation_sessions")
      .update({ recovery_notified_at: new Date().toISOString() })
      .eq("id", details.sessionId);
    return { sent: delivery.sent };
  } catch (error) {
    console.error("[plan-generation-alert] customer recovery email failed", error);
    return { sent: false, reason: "error" as const };
  }
}
