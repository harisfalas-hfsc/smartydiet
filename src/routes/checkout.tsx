import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createDietCheckout } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { startFreeSession } from "@/lib/free-access.functions";
import { generatePlan } from "@/lib/plan.functions";
import { analytics } from "@/lib/analytics";
import { getPurchaseChannel, NATIVE_PURCHASE_UNAVAILABLE_MESSAGE } from "@/lib/purchases";
import { TrustBar } from "@/components/Testimonials";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Search = { qid?: string; weeks?: number };

export const Route = createFileRoute("/checkout")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    qid: typeof s.qid === "string" ? s.qid : undefined,
    weeks: typeof s.weeks === "number" ? s.weeks : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if (!search.qid) throw redirect({ to: "/questionnaire" });
  },
  head: () => ({
    meta: [
      { title: "Checkout — SmartyDiet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { qid } = Route.useSearch();
  const create = useServerFn(createDietCheckout);
  const startFree = useServerFn(startFreeSession);
  const generate = useServerFn(generatePlan);
  const { freeAccessMode: freeModeSetting, loading: freeLoading } = useFreeAccessMode();
  const { user } = useAuth();
  // Admins never pay: they take the same complimentary path as Free Access Mode.
  const freeAccessMode = freeModeSetting || isAdminEmail(user?.email);
  const [freeMessage, setFreeMessage] = useState("Building your plan… this can take up to 2 minutes.");
  const [freeError, setFreeError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [weeks, setWeeks] = useState<1 | 2 | 4 | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!qid) return;
      const { data } = await supabase
        .from("questionnaires")
        .select("duration_weeks")
        .eq("id", qid)
        .maybeSingle();
      setWeeks(((data?.duration_weeks as any) ?? 2) as 1 | 2 | 4);
      setReady(true);
    })();
  }, [qid]);

  useEffect(() => {
    if (freeLoading || !freeAccessMode || !ready || !qid || !weeks) return;
    let cancelled = false;
    setFreeError(false);
    setFreeMessage("Building your plan… this can take up to 2 minutes.");
    (async () => {
      const res = await startFree({ data: { questionnaireId: qid, durationWeeks: weeks } });
      if (cancelled) return;
      if ("error" in res) {
        setFreeError(true);
        setFreeMessage(res.error);
        toast.error(res.error);
        return;
      }
      const planRes = await generate({ data: { sessionId: res.sessionId } });
      if (cancelled) return;
      if (planRes.error) {
        setFreeError(true);
        setFreeMessage(planRes.error);
        toast.error(planRes.error);
        return;
      }
      analytics.planReady(true);
      navigate({ to: "/plans/$sessionId", params: { sessionId: res.sessionId }, replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [freeLoading, freeAccessMode, ready, qid, weeks, startFree, generate, navigate, attempt]);

  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        if (!qid || !weeks) throw new Error("Missing questionnaire");
        analytics.beginCheckout(weeks);
        const res = await create({
          data: {
            questionnaireId: qid,
            durationWeeks: weeks,
            returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        if ("error" in res) {
          toast.error(res.error);
          throw new Error(res.error);
        }
        return res.clientSecret;
      },
    }),
    [qid, weeks, create],
  );

  if (freeLoading || freeAccessMode) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        {freeError ? (
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        ) : (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        )}
        <h1 className="mt-4 text-xl font-bold">
          {freeError ? "Plan generation paused" : "Building your plan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{freeMessage}</p>
        {freeError && (
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/plans" })}>
              My plans
            </Button>
            <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
          </div>
        )}
      </div>
    );
  }

  if (getPurchaseChannel() === "unavailable") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold">Almost there</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {NATIVE_PURCHASE_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Complete your payment</h1>
        <p className="text-sm text-muted-foreground">
          €9.99 — one plan, 1 initial generation + 2 refinements.
        </p>
      </div>
      <div id="checkout" className="rounded-lg border bg-card p-2">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <TrustBar className="mt-6" />
      <button
        onClick={() => navigate({ to: "/questionnaire" })}
        className="mt-4 text-sm text-muted-foreground underline"
      >
        Back
      </button>
    </div>
  );
}
