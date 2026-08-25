import { sendTemplateEmail } from "@/lib/email-templates/send-email";

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
    const attemptId = details.operationId ?? crypto.randomUUID();
    const referenceId = details.sessionId ?? details.questionnaireId ?? "unknown";

    await sendTemplateEmail("plan-generation-failure", ADMIN_EMAIL, {
      idempotencyKey: `plan-generation-failure-${referenceId}-${attemptId}`,
      templateData: {
        userName,
        userEmail,
        userId: context.userId,
        sessionId: details.sessionId,
        questionnaireId: details.questionnaireId,
        stage: details.stage ?? (details.refinement ? "Plan refinement" : "Initial plan generation"),
        reason: details.reason.slice(0, 4000),
        occurredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[plan-generation-alert] notification failed", error);
  }
}