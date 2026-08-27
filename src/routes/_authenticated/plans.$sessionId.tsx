import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generatePlan, listPlanVersions, restorePlanVersion } from "@/lib/plan.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  RefreshCw,
  Download,
  ShoppingBasket,
  History,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { waitForPlanGeneration } from "@/lib/generation-client";
import { reportPlanGenerationFailure } from "@/lib/plan-generation-alert.functions";
import { PlanContent } from "@/components/plans/PlanContent";
import { exportGroceryPdf, exportPlanPdf } from "@/lib/pdf-export";

const GENERATION_ERROR_MESSAGE = "We encountered an error this time. Please try again later.";

export const Route = createFileRoute("/_authenticated/plans/$sessionId")({
  head: () => ({
    meta: [{ title: "My plan — SmartyDiet" }, { name: "robots", content: "noindex" }],
  }),
  component: PlanView,
});

interface Session {
  id: string;
  duration_weeks: number;
  credits_total: number;
  credits_used: number;
  status: string;
  stripe_session_id: string | null;
}
interface PlanRow {
  id: string;
  version: number;
  plan: any;
  rationale: string | null;
  refinement_note: string | null;
  is_final: boolean;
  created_at: string;
}

function PlanView() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const generate = useServerFn(generatePlan);
  const listVersions = useServerFn(listPlanVersions);
  const restore = useServerFn(restorePlanVersion);
  const reportFailure = useServerFn(reportPlanGenerationFailure);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [versions, setVersions] = useState<PlanRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSessionLoading(true);
    setSessionLoadError(null);
    try {
      const { data, error } = await supabase
        .from("generation_sessions")
        .select("id,duration_weeks,credits_total,credits_used,status,stripe_session_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      const s = (data as Session | null) ?? null;
      if (!s) throw new Error("This plan session could not be found.");
      setSession(s);
      const rows = await (listVersions({ data: { sessionId } }) as Promise<PlanRow[]>).catch(
        () => [] as PlanRow[],
      );
      setVersions(rows);
      // Prefer is_final; else newest
      const active = rows.find((r) => r.is_final) ?? rows[0];
      setActiveId((prev) => prev ?? active?.id ?? null);
    } catch (error) {
      setSessionLoadError(
        error instanceof Error ? error.message : "This plan could not be loaded.",
      );
    } finally {
      setSessionLoading(false);
    }
  }, [sessionId, listVersions]);


  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoGenerating) return;
    const interval = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [autoGenerating, load]);

  useEffect(() => {
    if (autoGenerating && versions.length > 0) {
      setAutoGenerating(false);
      setGenerationError(null);
    }
  }, [autoGenerating, versions.length]);

  async function runGeneration() {
    const operationId = crypto.randomUUID();
    setAutoGenerating(true);
    setGenerationError(null);
    try {
      const res = await waitForPlanGeneration(generate({ data: { sessionId, operationId } }));
      if (res.error) {
        toast.error(GENERATION_ERROR_MESSAGE);
        navigate({ to: "/", replace: true });
        return;
      }
      toast.success("Your plan is ready");
      await load();
    } catch (e: any) {
      await reportFailure({
        data: {
          sessionId,
          operationId,
          stage: "Initial plan generation — client request",
          reason: e instanceof Error ? e.message : "Generation request failed",
        },
      }).catch(() => undefined);
      toast.error(GENERATION_ERROR_MESSAGE);
      navigate({ to: "/", replace: true });
    } finally {
      setAutoGenerating(false);
    }
  }

  // Initial paid-plan creation is owned by the Stripe webhook. This page only
  // polls the durable server state; it never starts another charge or generation.
  useEffect(() => {
    if (!session || versions.length > 0) return;
    if (!["generating", "paid", "completed"].includes(session.status)) return;
    setAutoGenerating(true);
    const interval = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(interval);
  }, [load, session, versions.length]);

  async function refine() {
    if (!refineText.trim()) return toast.error("Describe the change you want");
    setBusy(true);
    const operationId = crypto.randomUUID();
    try {
      const res = await waitForPlanGeneration(
        generate({ data: { sessionId, refinement: refineText.trim(), operationId } }),
      );
      if (res.error) throw new Error(res.error);
      setRefineText("");
      setActiveId(null); // let load() pick the new active
      await load();
      if (res.warnings?.length) {
        toast.warning(`Plan refined with ${res.warnings.length} warning(s)`);
      } else {
        toast.success("Plan refined");
      }
    } catch (e: any) {
      await reportFailure({
        data: {
          sessionId,
          operationId,
          stage: "Plan refinement — client request",
          reason: e instanceof Error ? e.message : "Refinement request failed",
        },
      }).catch(() => undefined);
      toast.error(GENERATION_ERROR_MESSAGE);
      navigate({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function doRestore(version: number) {
    setBusy(true);
    try {
      await restore({ data: { sessionId, version } });
      setActiveId(null);
      await load();
      toast.success(`Restored version ${version} (no credit spent)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Restore failed");
    } finally {
      setBusy(false);
    }
  }


  const active = versions.find((v) => v.id === activeId) ?? versions[0] ?? null;

  async function exportPdf() {
    if (!active) return;
    try {
      await exportPlanPdf(active.plan, session?.duration_weeks ?? 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build PDF");
    }
  }

  async function exportGrocery() {
    if (!active?.plan?.weeks) return;
    try {
      await exportGroceryPdf(active.plan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build PDF");
    }
  }

  if (!session)
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        {sessionLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-destructive" />
              <p className="mb-4 text-sm text-destructive">
                {sessionLoadError ?? "This plan could not be loaded."}
              </p>
              <Button onClick={() => void load()}>Try again</Button>
            </CardContent>
          </Card>
        )}

      </div>
    );

  const remaining = session.credits_total - session.credits_used;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your {session.duration_weeks}-week plan</h1>
          <p className="text-sm text-muted-foreground">
            {remaining} refinement{remaining === 1 ? "" : "s"} remaining · viewing v
            {active?.version ?? 1}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportGrocery} disabled={!active}>
            <ShoppingBasket className="mr-1.5 h-4 w-4" /> Grocery PDF
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={!active}>
            <Download className="mr-1.5 h-4 w-4" /> Plan PDF
          </Button>
        </div>
      </div>

      {!active ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {autoGenerating ? (
              <>
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                Building your plan… this can take up to 2 minutes.
              </>
            ) : generationError ? (
              <>
                <p className="mb-4 text-destructive">{generationError}</p>
                <Button asChild>
                  <Link to="/">Back to homepage</Link>
                </Button>
              </>
            ) : session.status === "paid" || session.status === "completed" ? (
              <>
                <p className="mb-4">Your payment is confirmed. Tap below to build your plan.</p>
                <Button onClick={runGeneration}>Generate my plan</Button>
              </>
            ) : (
              "No plan yet."
            )}
          </CardContent>
        </Card>
      ) : (
        <PlanContent plan={active.plan} durationWeeks={session.duration_weeks} />
      )}

      {versions.length > 1 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <p className="mb-3 font-semibold">
              <History className="mr-1.5 inline h-4 w-4 text-primary" />
              Plan versions
            </p>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${
                    v.id === active?.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      v{v.version}
                      {v.is_final ? " · active" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString()}
                      {v.refinement_note ? ` · "${v.refinement_note}"` : " · initial"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={v.id === active?.id ? "secondary" : "outline"}
                      onClick={() => setActiveId(v.id)}
                    >
                      View
                    </Button>
                    {!v.is_final && (
                      <Button size="sm" onClick={() => doRestore(v.version)} disabled={busy}>
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Restoring a previous version does NOT cost a credit.
            </p>
          </CardContent>
        </Card>
      )}

      {active && remaining > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <p className="font-semibold">
              <RefreshCw className="mr-1.5 inline h-4 w-4 text-primary" />
              Refine your plan ({remaining} left)
            </p>
            <Textarea
              className="mt-2"
              rows={3}
              placeholder='e.g. "one meal per day", "no dairy", "1800 kcal", "more protein"'
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={refine} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refine plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link to="/plans">← All plans</Link>
        </Button>
      </div>
    </div>
  );
}
