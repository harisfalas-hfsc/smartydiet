import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { markSessionAuthorized } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Apple, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { reportPlanGenerationFailure } from "@/lib/plan-generation-alert.functions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GENERATION_ERROR_MESSAGE = "We encountered an error this time. Please try again later.";
const CREATION_TIPS = [
  "We are checking every answer from your questionnaire.",
  "We are matching meals to your diet style, allergies, and food preferences.",
  "We are balancing daily calories, portions, and meal timing.",
  "We are validating every day before your plan is delivered.",
];

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
  const reportFailure = useServerFn(reportPlanGenerationFailure);
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const processingStarted = useRef(false);
  const [retryKey, setRetryKey] = useState(0);
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState(
    "Hold on. We are creating your diet plan according to your needs.",
  );
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    toast.dismiss();
  }, []);

  useEffect(() => {
    if (status !== "working") return;
    const interval = window.setInterval(
      () => setTipIndex((current) => (current + 1) % CREATION_TIPS.length),
      7_000,
    );
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token) {
      let active = true;
      void supabase.auth.getSession().then(({ data }) => {
        if (!active || data.session?.access_token) return;
        setStatus("error");
        setMessage(
          "Your secure session expired before the diet could start. Sign in again with the same account; your card authorization and questionnaire are saved.",
        );
      });
      return () => {
        active = false;
      };
    }
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
        // Card authorization can settle shortly after Stripe returns. Keep this
        // page stationary and retry here rather than sending the customer away.
        for (
          let attempt = 0;
          attempt < 15 && !paidRes.error && (!paidRes.paid || !paidRes.generationSessionId);
          attempt++
        ) {
          if (active) setMessage("Confirming your card authorization…");
          await new Promise((resolve) => setTimeout(resolve, 2_000));
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
            setMessage(
              paidRes.error ||
                "Your card authorization could not be confirmed. Your card has not been charged.",
            );
          }
          return;
        }
        analytics.purchase(session_id);
        generationSessionId = paidRes.generationSessionId;
        operationId = paidRes.generationSessionId;
        if (active) {
          setMessage(
            "Hold on. We are creating the best diet we can for your questionnaire needs. This can take up to 3 minutes.",
          );
        }
        // The payment webhook is the sole owner of initial generation, so
        // closing this tab can never terminate the job or create a duplicate.
        let planError: string | undefined;
        while (active) {
          const [{ data: plan }, { data: generation }] = await Promise.all([
            supabase
              .from("diet_plans")
              .select("id")
              .eq("session_id", paidRes.generationSessionId)
              .limit(1)
              .maybeSingle(),
            supabase
              .from("generation_sessions")
              .select("status")
              .eq("id", paidRes.generationSessionId)
              .maybeSingle(),
          ]);
          if (plan && (generation?.status === "paid" || generation?.status === "completed")) break;
          if (generation?.status === "failed" || generation?.status === "authorization_released") {
            planError = "We could not create your diet this time. Your card was not charged.";
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 4_000));
        }
        if (!active) return;
        if (planError) {
          toast.error(GENERATION_ERROR_MESSAGE);
          setStatus("error");
          setMessage(planError);
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
            "The connection was interrupted. Your saved process may still be completing securely. Please try again to check the same plan; do not start another questionnaire or payment.",
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
    setMessage("Hold on. We are continuing your diet from your saved questionnaire.");
    setRetryKey((value) => value + 1);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="diet-processing-title"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card text-left shadow-2xl"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              {status === "working" && <Apple className="h-6 w-6" />}
              {status === "done" && <CheckCircle2 className="h-6 w-6" />}
              {status === "error" && <AlertTriangle className="h-6 w-6 text-destructive" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-primary">
                {status === "working" ? "Your personalized plan is underway" : "SmartyDiet update"}
              </p>
              <h1 id="diet-processing-title" className="mt-1 text-2xl font-extrabold">
                {status === "error" ? "We could not finish this time" : "Please be patient"}
              </h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-foreground">{message}</p>
          {status === "working" && (
            <>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
              <div className="mt-6 rounded-md border border-border bg-muted/40 p-4" aria-live="polite">
                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-bold uppercase text-primary">What we are doing now</p>
                    <p className="mt-1 min-h-12 text-sm leading-6 text-foreground">
                      {CREATION_TIPS[tipIndex]}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex gap-3 border-t border-border pt-5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm font-semibold leading-5">
                  Stay on this screen and do not close this window. If you must leave, your saved
                  questionnaire will continue processing securely in the background and your diet
                  will appear in My Plans when it is ready.
                </p>
              </div>
            </>
          )}
          {status === "error" && (
            <Button className="mt-6 w-full" onClick={retry}>Try again</Button>
          )}
        </div>
      </section>
    </div>
  );
}
