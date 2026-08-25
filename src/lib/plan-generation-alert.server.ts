import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { classifyGenerationFailure, generationFailureLabel } from "@/lib/attempt-outcomes";

const ADMIN_EMAIL = "smartydiet@outlook.com";

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

    const delivery = await sendTemplateEmail("plan-generation-failure", ADMIN_EMAIL, {
      idempotencyKey: `plan-generation-failure-${referenceId}-${failureId}`,
      templateData: {
        userName,
        userEmail,
        userId: context.userId,
        sessionId: details.sessionId,
        questionnaireId: details.questionnaireId,
        stage: details.stage ?? (details.refinement ? "Plan refinement" : "Initial plan generation"),
        outcomeLabel,
        paymentState: "Payment completed",
        reason: details.reason.slice(0, 4000),
        occurredAt,
      },
    });
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