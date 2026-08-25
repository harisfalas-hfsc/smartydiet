import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { markSessionPaid } from "@/lib/payments.functions";
import { generatePlan } from "@/lib/plan.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { waitForPlanGeneration } from "@/lib/generation-client";
import { reportPlanGenerationFailure } from "@/lib/plan-generation-alert.functions";

const GENERATION_ERROR_MESSAGE = "We encountered an error this time. Please try again later.";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Building your plan — SmartyDiet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Return,
});

function Return() {
  const { session_id } = Route.useSearch();
  const mark = useServerFn(markSessionPaid);
  const generate = useServerFn(generatePlan);
  const reportFailure = useServerFn(reportPlanGenerationFailure);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Confirming payment…");

  useEffect(() => {
    (async () => {
      const operationId = crypto.randomUUID();
      let generationSessionId: string | undefined;
      if (!session_id) {
        setStatus("error");
        setMessage("Missing session id");
        return;
      }
      try {
        const paidRes = await mark({
          data: { stripeSessionId: session_id, environment: getStripeEnvironment() },
        });
        if (!("paid" in paidRes) || !paidRes.paid || !paidRes.generationSessionId) {
          await reportFailure({
            data: {
              operationId,
              stage: "Payment confirmation before plan generation",
              reason: "Payment could not be confirmed or no generation session was returned",
            },
          }).catch(() => undefined);
          setStatus("error");
          setMessage("We could not confirm your payment yet. Please contact support.");
          return;
        }
        analytics.purchase(session_id);
        generationSessionId = paidRes.generationSessionId;
        setMessage("Payment confirmed. Building your plan… this can take up to 2 minutes.");
        const planRes = await waitForPlanGeneration(
          generate({ data: { sessionId: paidRes.generationSessionId, operationId } }),
        );
        if (planRes.error) {
          navigate({ to: "/", replace: true });
          return;
        }
        analytics.planReady(false);
        setStatus("done");
        setMessage("Your plan is ready. Opening it now…");
        navigate({
          to: "/plans/$sessionId",
          params: { sessionId: paidRes.generationSessionId },
          replace: true,
        });
      } catch (err: any) {
        await reportFailure({
          data: {
            sessionId: generationSessionId,
            operationId,
            stage: generationSessionId
              ? "Initial plan generation — client request"
              : "Payment confirmation before plan generation",
            reason: err instanceof Error ? err.message : "Plan creation request failed",
          },
        }).catch(() => undefined);
        navigate({ to: "/", replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      {status === "working" && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
      {status === "done" && <CheckCircle2 className="h-10 w-10 text-primary" />}
      {status === "error" && <AlertTriangle className="h-10 w-10 text-destructive" />}
      <h1 className="mt-4 text-xl font-bold">{status === "error" ? "There was a problem" : "Almost there"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {status === "error" && (
        <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
          Back to homepage
        </Button>
      )}
    </div>
  );
}
