import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPlanGenerationFailureAlert } from "@/lib/plan-generation-alert.server";

export const reportPlanGenerationFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    sessionId?: string;
    questionnaireId?: string;
    operationId: string;
    stage: string;
    reason: string;
  }) => input)
  .handler(async ({ data, context }) => {
    await sendPlanGenerationFailureAlert(
      {
        supabase: context.supabase,
        userId: context.userId,
        claims: context.claims as Record<string, unknown>,
      },
      data,
    );
    return { reported: true };
  });