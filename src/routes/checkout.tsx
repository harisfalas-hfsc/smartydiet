import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createDietCheckout } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        if (!qid || !weeks) throw new Error("Missing questionnaire");
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
          $4.99 — one plan, 1 initial generation + 2 refinements.
        </p>
      </div>
      <div id="checkout" className="rounded-lg border bg-card p-2">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <button
        onClick={() => navigate({ to: "/questionnaire" })}
        className="mt-4 text-sm text-muted-foreground underline"
      >
        Back
      </button>
    </div>
  );
}
