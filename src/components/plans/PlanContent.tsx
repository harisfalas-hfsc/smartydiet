import { useState } from "react";
import { AlertTriangle, Brain, CalendarDays, CheckCircle2, Download, ShoppingBasket } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toneClasses, type SmartyTone } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";
import { exportGroceryPdf, exportPlanPdf } from "@/lib/pdf-export";
import { toast } from "sonner";
import {
  mealSlotsFor,
  sortPlanStructure,
  verifyPlanStructure,
} from "@/lib/plan-validation";

type Props = {
  plan: any;
  durationWeeks: number;
  showDownloads?: boolean;
};

const WEEK_TONES: SmartyTone[] = ["cyan", "green", "pink", "orange", "purple", "yellow", "blue"];
const WEEK_EMOJIS = ["🥗", "🍓", "🥑", "🍇", "🥕", "🍋", "🫐"];

function mealEmoji(name: string) {
  const n = String(name ?? "").toLowerCase();
  if (n.includes("breakfast")) return "🍳";
  if (n.includes("lunch")) return "🥗";
  if (n.includes("dinner")) return "🍽️";
  if (n.includes("bed")) return "🌙";
  if (n.includes("snack")) return "🍎";
  return "🥄";
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PlanContent({ plan: rawPlan, durationWeeks, showDownloads = false }: Props) {
  const plan = sortPlanStructure(rawPlan);
  const warnings: string[] = plan?._warnings ?? [];
  const weeks: any[] = plan?.weeks ?? [];
  const summary = plan?.summary;

  // Rules the plan was generated from. Older plans don't store them, so fall
  // back to what the stored structure actually contains.
  const expectedWeeks = Number(summary?.weeks) || weeks.length || durationWeeks;
  const expectedMealsPerDay =
    Number(summary?.mealsPerDay) || Number(weeks[0]?.days?.[0]?.meals?.length) || 3;
  const slots: string[] = summary?.mealSlots?.length
    ? summary.mealSlots
    : mealSlotsFor(expectedMealsPerDay);
  const snacks = slots.filter((slot) => slot.toLowerCase().includes("snack"));
  const report = verifyPlanStructure(plan, expectedWeeks, expectedMealsPerDay);
  const download = async (kind: "grocery" | "plan") => {
    try {
      if (kind === "grocery") await exportGroceryPdf(plan);
      else await exportPlanPdf(plan, durationWeeks);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The PDF could not be created.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {showDownloads && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => void download("grocery")}>
            <ShoppingBasket className="mr-1.5 h-4 w-4" /> Grocery PDF
          </Button>
          <Button size="sm" onClick={() => void download("plan")}>
            <Download className="mr-1.5 h-4 w-4" /> Plan PDF
          </Button>
        </div>
      )}

      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-1 font-semibold">The generator couldn't fully match the rules:</p>
            <ul className="list-disc pl-4 text-xs">
              {warnings.slice(0, 5).map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card className={report.ok ? "border-primary/40 bg-primary/5" : "border-destructive/50"}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-2">
            {report.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            )}
            <div className="text-sm">
              <p className="font-semibold">
                {report.ok ? "Plan verified — complete" : "Plan incomplete"}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.weeks}/{report.expectedWeeks} weeks · {report.totalDays}/
                {report.expectedDays} days · {report.expectedMealsPerDay} meals every day
              </p>
              {!report.ok && (
                <ul className="mt-1 list-disc pl-4 text-xs text-destructive">
                  {report.problems.map((problem, index) => <li key={index}>{problem}</li>)}
                </ul>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{expectedWeeks} week{expectedWeeks === 1 ? "" : "s"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Days per week</dt>
              <dd className="font-medium">7</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Meals per day</dt>
              <dd className="font-medium">{expectedMealsPerDay}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Snacks per day</dt>
              <dd className="font-medium">{snacks.length}</dd>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-muted-foreground">Daily meal order</dt>
              <dd className="font-medium">{slots.join(" · ")}</dd>
            </div>
            {summary?.fastingWindow && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-muted-foreground">Fasting window</dt>
                <dd className="font-medium">{summary.fastingWindow}</dd>
              </div>
            )}
            {summary?.excludeFoods?.length ? (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-muted-foreground">Excluded foods</dt>
                <dd className="font-medium">{summary.excludeFoods.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="font-semibold">{summary.calorieTarget} kcal / day</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Protein {summary.macros?.protein_g}g · Carbs {summary.macros?.carbs_g}g · Fat {summary.macros?.fat_g}g
            </p>
            <p className="mt-1 text-xs uppercase text-muted-foreground">
              {summary.dietStyle} · {summary.goal}
            </p>
          </CardContent>
        </Card>
      )}


      {weeks.length > 0 && (
        <Card>
          <CardContent className="space-y-4 p-4">
            {weeks.map((week: any, weekIndex: number) => {
              const tone = toneClasses(WEEK_TONES[weekIndex % WEEK_TONES.length]);
              return (
                <div key={`nav-${week.weekNumber}`} className="space-y-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider transition hover:opacity-80",
                      tone.softBorder,
                      tone.softBg,
                      tone.text,
                    )}
                    onClick={() => jumpTo(`week-${week.weekNumber}`)}
                  >
                    {WEEK_EMOJIS[weekIndex % WEEK_EMOJIS.length]} Week {week.weekNumber}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {(week.days ?? []).map((day: any) => (
                      <button
                        key={`nav-day-${day.day}`}
                        type="button"
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80",
                          tone.softBorder,
                          "bg-card",
                          tone.text,
                        )}
                        onClick={() => jumpTo(`week-${week.weekNumber}-day-${day.day}`)}
                      >
                        Day {day.day}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}


      {weeks.map((week: any, weekIndex: number) => {
        const tone = toneClasses(WEEK_TONES[weekIndex % WEEK_TONES.length]);
        const emoji = WEEK_EMOJIS[weekIndex % WEEK_EMOJIS.length];
        return (
          <div key={week.weekNumber} id={`week-${week.weekNumber}`} className="scroll-mt-24 space-y-3">
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3",
                tone.border,
                tone.softBg,
              )}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <h3 className={cn("text-lg font-extrabold tracking-tight sm:text-xl", tone.text)}>
                Week {week.weekNumber}
              </h3>
              <span className="ml-auto text-xs font-semibold text-muted-foreground">
                {(week.days ?? []).length} days
              </span>
            </div>

            {(week.days ?? []).map((day: any) => (
              <Card
                key={day.day}
                id={`week-${week.weekNumber}-day-${day.day}`}
                className={cn("scroll-mt-24 border-2", tone.softBorder)}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                        tone.softBorder,
                        tone.softBg,
                        tone.text,
                      )}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Week {week.weekNumber} · Day {day.day}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                        tone.softBorder,
                        tone.text,
                      )}
                    >
                      🔥 {day.totals?.calories ?? "-"} kcal
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(day.meals ?? []).map((meal: any, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          "rounded-xl border p-3 text-sm",
                          tone.softBorder,
                          tone.softBg,
                        )}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold text-foreground">
                            <span className="mr-1.5">{mealEmoji(meal.name)}</span>
                            <span className={tone.text}>{meal.name}</span>
                            <span className="text-muted-foreground"> — </span>
                            {meal.title}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {meal.calories} kcal · P{meal.protein_g} C{meal.carbs_g} F{meal.fat_g}
                          </p>
                        </div>
                        {meal.ingredients?.length ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {meal.ingredients.map((item: any) => `${item.qty} ${item.item}`).join(", ")}
                          </p>
                        ) : null}
                        {meal.instructions && <p className="mt-1 text-xs">{meal.instructions}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {week.groceryList?.length ? (
              <Card className={cn("border-2", tone.softBorder)}>
                <CardContent className="p-4">
                  <p className={cn("mb-2 flex items-center gap-1.5 font-bold", tone.text)}>
                    <ShoppingBasket className="h-4 w-4" />
                    Grocery list — Week {week.weekNumber}
                  </p>
                  <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    {week.groceryList.map((item: any, index: number) => (
                      <li key={index} className="text-muted-foreground">
                        • {item.qty} {item.item}{item.category ? ` (${item.category})` : ""}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        );
      })}

      {plan?.rationale && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full text-left"
            >
              <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 transition hover:opacity-90 dark:border-violet-500/40 dark:from-violet-500/15 dark:to-purple-500/10">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white dark:border-violet-500/40 dark:bg-violet-950/40">
                    <Brain className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <p className="font-bold text-violet-700 dark:text-violet-200">Why this plan fits you</p>
                </CardContent>
              </Card>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-2xl border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-0 dark:border-violet-500/40 dark:from-violet-500/15 dark:to-purple-500/10">
            <DialogHeader className="border-b border-violet-200 p-4 dark:border-violet-500/40">
              <DialogTitle className="flex items-center gap-3 text-lg font-bold text-violet-700 dark:text-violet-200">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white dark:border-violet-500/40 dark:bg-violet-950/40">
                  <Brain className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                </div>
                Why this plan fits you
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <p className="text-sm leading-relaxed text-violet-900/80 dark:text-violet-100/80">
                {plan.rationale}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {plan?.disclaimer && <p className="text-xs text-muted-foreground">{plan.disclaimer}</p>}
    </div>
  );
}