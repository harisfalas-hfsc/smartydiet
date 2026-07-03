import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { markSessionPaid } from "@/lib/payments.functions";
import { generatePlan } from "@/lib/plan.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Confirming payment…");

  useEffect(() => {
    (async () => {
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
          setStatus("error");
          setMessage("We could not confirm your payment yet. Please contact support.");
          return;
        }
        // Navigate to the plan page immediately — it self-heals by generating
        // the plan if it doesn't exist yet. This avoids losing paid sessions
        // when the AI call is slow or the browser tab loses focus.
        setStatus("done");
        setMessage("Payment confirmed. Opening your plan…");
        navigate({ to: "/plans/$sessionId", params: { sessionId: paidRes.generationSessionId } });
        // Kick off generation in the background as well (best-effort).
        generate({ data: { sessionId: paidRes.generationSessionId } }).catch(() => {});
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message ?? "Something went wrong");
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
        <Button className="mt-6" onClick={() => navigate({ to: "/plans" })}>
          Go to My plans
        </Button>
      )}
    </div>
  );
}
