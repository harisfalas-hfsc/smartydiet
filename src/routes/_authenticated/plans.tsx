import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles, ClipboardList } from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";


export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "My plans — SmartyDiet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansList,
});

interface Row {
  id: string;
  duration_weeks: number;
  status: string;
  credits_used: number;
  credits_total: number;
  created_at: string;
}

const TONES: Array<"cyan" | "green" | "orange" | "purple" | "yellow" | "pink" | "blue"> = [
  "cyan",
  "green",
  "orange",
  "purple",
  "yellow",
  "pink",
  "blue",
];

function PlansList() {
  const { freeAccessMode } = useFreeAccessMode();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [rows, setRows] = useState<Row[] | null>(null);


  async function fetchRows() {
    const { data: plans, error: plansError } = await supabase
      .from("diet_plans")
      .select("session_id");
    if (plansError) throw plansError;

    const readySessionIds = [...new Set((plans ?? []).map((plan) => plan.session_id))];
    if (readySessionIds.length === 0) return [];

    const { data: fresh, error } = await supabase
      .from("generation_sessions")
      .select("id,duration_weeks,status,credits_used,credits_total,created_at")
      .in("id", readySessionIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (fresh ?? []) as Row[];
  }

  useEffect(() => {
    let active = true;
    void fetchRows()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (pathname !== "/plans") return <Outlet />;

  const hasActive = (rows ?? []).some(
    (r) => (r.credits_used ?? 0) < (r.credits_total ?? 0),
  );
  const showNewPlanCard = rows !== null && rows.length > 0 && !hasActive;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Your plans
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          My <span className="text-primary">Smarty Meal Plans™</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Every plan you build lives here — original and refined versions included.
        </p>
        {rows !== null && rows.length > 0 && (
          <div className="mt-5 flex justify-center">
            <Button asChild size="sm" variant={hasActive ? "outline" : "default"}>
              <Link to="/questionnaire">New plan</Link>
            </Button>
          </div>
        )}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <SmartyCard
          tone="cyan"
          eyebrow="Get started"
          eyebrowIcon="🚀"
          cornerIcon={FileText}
          title="No plans"
          accent="yet."
          description="Build your first personalized Smarty Meal Plan™ in a few minutes."
        >
          <Button asChild size="lg">
            <Link to="/questionnaire">Build my first plan</Link>
          </Button>
        </SmartyCard>

      ) : (
        <>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => {
              const active = (r.credits_used ?? 0) < (r.credits_total ?? 0);
              const tone = active ? "green" : TONES[i % TONES.length];
              return (
                <SmartyCard
                  key={r.id}
                  tone={tone}
                  eyebrow={active ? "Active" : "Completed"}
                  eyebrowIcon={active ? "✅" : "📁"}
                  cornerIcon={ClipboardList}
                  title={`${r.duration_weeks}-week`}
                  accent="plan"
                >
                  <div className="space-y-3">
                    <SmartyRow
                      tone={tone}
                      icon="📅"
                      title="Created"
                      subtitle={new Date(r.created_at).toLocaleDateString()}
                    />
                    <SmartyRow
                      tone={tone}
                      icon="✏️"
                      title="Credits"
                      subtitle={`${r.credits_used}/${r.credits_total} used`}
                    />
                  </div>
                  <div className="mt-6">
                    <Button asChild size="sm">
                      <Link to="/plans/$sessionId" params={{ sessionId: r.id }}>View plan →</Link>
                    </Button>
                  </div>
                </SmartyCard>
              );
            })}

          </div>

          {showNewPlanCard && (
            <div className="mt-8">
              <SmartyCard
                tone="pink"
                eyebrow="Fresh start"
                eyebrowIcon="✨"
                cornerIcon={Sparkles}
                title="Want a"
                accent="new plan?"
                description={freeAccessMode ? "You've used the refinement on your current plans. Create a brand new personalized diet plan." : "You've used the refinement on your current plans. Create a brand new personalized diet plan for €9.99."}
              >
                <Button asChild size="lg">
                  <Link to="/questionnaire">{freeAccessMode ? "Create a new diet plan" : "Create a new diet plan — €9.99"}</Link>
                </Button>
              </SmartyCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
