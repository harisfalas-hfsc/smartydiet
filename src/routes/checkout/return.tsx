import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  markSessionAuthorized,
  captureDietPayment,
  releaseDietAuthorization,
} from "@/lib/payments.functions";
import { generatePlan } from "@/lib/plan.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { waitForPlanGeneration } from "@/lib/generation-client";
import { reportPlanGenerationFailure } from "@/lib/plan-generation-alert.functions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GENERATION_ERROR_MESSAGE = "We encountered an error this time. Please try again later.";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [{ title: "Building your plan — SmartyDiet" }, { name: "robots", content: "noindex" }],
  }),
  component: Return,
});

function Return() {
  const { session_id } = Route.useSearch();
  const mark = useServerFn(markSessionAuthorized);
  const capture = useServerFn(captureDietPayment);
  const release = useServerFn(releaseDietAuthorization);
  const generate = useServerFn(generatePlan);
  const reportFailure = useServerFn(reportPlanGenerationFailure);
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const processingStarted = useRef(false);
  const [retryKey, setRetryKey] = useState(0);
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Please wait. Your diet is generating…");

  useEffect(() => {
    if (authLoading || !session?.access_token) return;
    if (processingStarted.current) return;
    processingStarted.current = true;
    let active = true;
    (async () => {
      let operationId: string = crypto.randomUUID();
      let generationSessionId: string | undefined;
      if (!session_id) {
        if (active) {
          setStatus("error");
          setMessage("This payment session could not be found.");
        }
        return;
      }
      try {
        let paidRes = await mark({
          data: { stripeSessionId: session_id, environment: getStripeEnvironment() },
        });
        // Stripe can redirect a fraction before the final PaymentIntent state is
        // visible through its API. Retry briefly instead of stranding a valid
        // authorization on a false "not confirmed" screen.
        for (
          let attempt = 0;
          attempt < 4 && (!paidRes.paid || !paidRes.generationSessionId);
          attempt++
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          paidRes = await mark({
            data: { stripeSessionId: session_id, environment: getStripeEnvironment() },
          });
        }
        if (!("paid" in paidRes) || !paidRes.paid || !paidRes.generationSessionId) {
          await reportFailure({
            data: {
              operationId,
              stage: "Payment confirmation before plan generation",
              reason: "Payment could not be confirmed or no generation session was returned",
            },
          }).catch(() => undefined);
          if (active) {
            setStatus("error");
            setMessage("We could not confirm the authorization. Please try again.");
          }
          return;
        }
        analytics.purchase(session_id);
        generationSessionId = paidRes.generationSessionId;
        operationId = paidRes.generationSessionId;
        if (active) {
          setMessage("Please wait. Your diet is generating… this can take up to 2 minutes.");
        }
        const planRes = await waitForPlanGeneration(
          generate({ data: { sessionId: paidRes.generationSessionId, operationId } }),
        );
        if (planRes.error) {
          await release({
            data: {
              generationSessionId: paidRes.generationSessionId,
              environment: getStripeEnvironment(),
              reason: planRes.error,
            },
          }).catch(() => undefined);
          toast.error(GENERATION_ERROR_MESSAGE);
          if (active) {
            setStatus("error");
            setMessage(
              "Generation failed and your card authorization was released. You were not charged.",
            );
          }
          return;
        }
        if (active) setMessage("Your plan is ready. Completing payment…");
        const captureResult = await capture({
          data: {
            generationSessionId: paidRes.generationSessionId,
            environment: getStripeEnvironment(),
          },
        });
        if (!captureResult.captured) {
          toast.error(
            "Your diet is ready, but payment could not be completed. Support has been notified.",
          );
        }
        analytics.planReady(false);
        if (!active) return;
        setStatus("done");
        setMessage("Your plan is ready. Opening it now…");
        navigate({
          to: "/plans/$sessionId",
          params: { sessionId: paidRes.generationSessionId },
          replace: true,
        });
      } catch (err: unknown) {
        // An interrupted browser request does not prove server-side generation
        // failed. Keep this page stationary so global recovery cannot create a
        // redirect loop, and let the customer safely retry the same operation.
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
        if (active) {
          setStatus("error");
          setMessage(
            "The connection was interrupted. Your card has not been charged. Please try again to continue the same plan.",
          );
        }
      }
    })();
    return () => {
      active = false;
    };
    // Server-function references are stable for this route instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, retryKey, session?.access_token, session_id]);

  function retry() {
    processingStarted.current = false;
    setStatus("working");
    setMessage("Please wait. Your diet is generating…");
    setRetryKey((value) => value + 1);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      {status === "working" && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
      {status === "done" && <CheckCircle2 className="h-10 w-10 text-primary" />}
      {status === "error" && <AlertTriangle className="h-10 w-10 text-destructive" />}
      <h1 className="mt-4 text-xl font-bold">
        {status === "error" ? "Your plan is safe" : "Almost there"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {status === "error" && (
        <Button className="mt-6" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
