import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generatePlan } from "@/lib/plan.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Utensils, ShoppingBasket, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

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
}
interface Plan {
  id: string;
  version: number;
  plan: any;
  rationale: string | null;
  is_final: boolean;
  created_at: string;
}

function PlanView() {
  const { sessionId } = Route.useParams();
  const generate = useServerFn(generatePlan);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: s } = await supabase
      .from("generation_sessions")
      .select("id,duration_weeks,credits_total,credits_used")
      .eq("id", sessionId)
      .maybeSingle();
    setSession(s as Session | null);
    const { data: p } = await supabase
      .from("diet_plans")
      .select("id,version,plan,rationale,is_final,created_at")
      .eq("session_id", sessionId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPlan(p as Plan | null);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function refine() {
    if (!refineText.trim()) return toast.error("Describe the change you want");
    setBusy(true);
    try {
      const res = await generate({
        data: { sessionId, refinement: refineText.trim() },
      });
      if (res.error) throw new Error(res.error);
      setRefineText("");
      await load();
      toast.success("Plan refined");
    } catch (e: any) {
      toast.error(e.message ?? "Refinement failed");
    } finally {
      setBusy(false);
    }
  }

  function exportPdf() {
    if (!plan) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const height = doc.internal.pageSize.getHeight() - margin;
    const write = (txt: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(txt, width);
      for (const line of lines) {
        if (y > height) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size * 1.3;
      }
    };
    write("SmartyDiet — Personalized Plan", 18, true);
    y += 6;
    const p = plan.plan;
    if (p?.summary) {
      write(
        `Calorie target: ${p.summary.calorieTarget} kcal · Protein ${p.summary.macros?.protein_g}g · Carbs ${p.summary.macros?.carbs_g}g · Fat ${p.summary.macros?.fat_g}g`,
      );
      write(`Diet style: ${p.summary.dietStyle} · Goal: ${p.summary.goal}`);
      y += 6;
    }
    for (const w of p?.weeks ?? []) {
      write(`Week ${w.weekNumber}`, 14, true);
      for (const d of w.days ?? []) {
        write(`Day ${d.day} — ${d.totals?.calories ?? "-"} kcal`, 12, true);
        for (const m of d.meals ?? []) {
          write(`• ${m.name}: ${m.title} — ${m.calories} kcal (P${m.protein_g}/C${m.carbs_g}/F${m.fat_g})`);
          if (m.ingredients?.length)
            write(`  Ingredients: ${m.ingredients.map((i: any) => `${i.qty} ${i.item}`).join(", ")}`);
          if (m.instructions) write(`  ${m.instructions}`);
        }
        y += 4;
      }
      if (w.groceryList?.length) {
        write("Grocery list", 12, true);
        for (const g of w.groceryList) write(`- ${g.qty} ${g.item}${g.category ? ` (${g.category})` : ""}`);
      }
      y += 8;
    }
    if (p?.rationale) {
      write("Why this plan", 14, true);
      write(p.rationale);
    }
    if (p?.disclaimer) {
      y += 6;
      write(p.disclaimer, 9);
    }
    doc.save("smartydiet-plan.pdf");
  }

  function exportGrocery() {
    if (!plan?.plan?.weeks) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const height = doc.internal.pageSize.getHeight() - margin;
    const write = (txt: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      for (const line of doc.splitTextToSize(txt, width)) {
        if (y > height) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size * 1.3;
      }
    };
    write("SmartyDiet — Grocery List", 18, true);
    for (const w of plan.plan.weeks) {
      write(`Week ${w.weekNumber}`, 14, true);
      for (const g of w.groceryList ?? [])
        write(`☐ ${g.qty} ${g.item}${g.category ? ` (${g.category})` : ""}`);
      y += 6;
    }
    doc.save("smartydiet-grocery.pdf");
  }

  if (!session)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const remaining = session.credits_total - session.credits_used;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your {session.duration_weeks}-week plan</h1>
          <p className="text-sm text-muted-foreground">
            {remaining} refinement{remaining === 1 ? "" : "s"} remaining · v{plan?.version ?? 1}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportGrocery} disabled={!plan}>
            <ShoppingBasket className="mr-1.5 h-4 w-4" /> Grocery PDF
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={!plan}>
            <Download className="mr-1.5 h-4 w-4" /> Plan PDF
          </Button>
        </div>
      </div>

      {!plan ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No plan generated yet. This normally takes 20–40 seconds. If you just paid, please wait.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {plan.plan?.summary && (
            <Card>
              <CardContent className="p-4 text-sm">
                <p className="font-semibold">
                  {plan.plan.summary.calorieTarget} kcal / day ·{" "}
                  <span className="text-muted-foreground">
                    P {plan.plan.summary.macros?.protein_g}g · C{" "}
                    {plan.plan.summary.macros?.carbs_g}g · F {plan.plan.summary.macros?.fat_g}g
                  </span>
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {plan.plan.summary.dietStyle} · {plan.plan.summary.goal}
                </p>
              </CardContent>
            </Card>
          )}

          {(plan.plan?.weeks ?? []).map((w: any) => (
            <div key={w.weekNumber} className="space-y-3">
              <h2 className="text-lg font-bold">Week {w.weekNumber}</h2>
              {(w.days ?? []).map((d: any) => (
                <Card key={d.day}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">Day {d.day}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.totals?.calories ?? "-"} kcal
                      </p>
                    </div>
                    <div className="space-y-3">
                      {(d.meals ?? []).map((m: any, i: number) => (
                        <div key={i} className="rounded-md border p-3 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium">
                              <Utensils className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                              {m.name}: {m.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.calories} kcal · P{m.protein_g} C{m.carbs_g} F{m.fat_g}
                            </p>
                          </div>
                          {m.ingredients?.length ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {m.ingredients.map((x: any) => `${x.qty} ${x.item}`).join(", ")}
                            </p>
                          ) : null}
                          {m.instructions && (
                            <p className="mt-1 text-xs">{m.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {w.groceryList?.length ? (
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-2 font-semibold">
                      <ShoppingBasket className="mr-1.5 inline h-4 w-4 text-primary" />
                      Grocery list — week {w.weekNumber}
                    </p>
                    <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                      {w.groceryList.map((g: any, i: number) => (
                        <li key={i} className="text-muted-foreground">
                          • {g.qty} {g.item}
                          {g.category ? ` (${g.category})` : ""}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ))}

          {plan.plan?.rationale && (
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold">Why this plan fits you</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.plan.rationale}</p>
              </CardContent>
            </Card>
          )}
          {plan.plan?.disclaimer && (
            <p className="text-xs text-muted-foreground">{plan.plan.disclaimer}</p>
          )}
        </div>
      )}

      {plan && remaining > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <p className="font-semibold">
              <RefreshCw className="mr-1.5 inline h-4 w-4 text-primary" />
              Refine your plan ({remaining} left)
            </p>
            <Textarea
              className="mt-2"
              rows={3}
              placeholder="e.g. Swap breakfasts for higher-protein options; less dairy; more Mediterranean flavors"
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
