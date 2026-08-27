import { AlertTriangle, Download, ShoppingBasket, Utensils } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exportGroceryPdf, exportPlanPdf } from "@/lib/pdf-export";

type Props = {
  plan: any;
  durationWeeks: number;
  showDownloads?: boolean;
};

export function PlanContent({ plan, durationWeeks, showDownloads = false }: Props) {
  const warnings: string[] = plan?._warnings ?? [];

  return (
    <div className="space-y-6">
      {showDownloads && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportGroceryPdf(plan)}>
            <ShoppingBasket className="mr-1.5 h-4 w-4" /> Grocery PDF
          </Button>
          <Button size="sm" onClick={() => void exportPlanPdf(plan, durationWeeks)}>
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

      {plan?.summary && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="font-semibold">
              {plan.summary.calorieTarget} kcal / day ·{" "}
              <span className="text-muted-foreground">
                P {plan.summary.macros?.protein_g}g · C {plan.summary.macros?.carbs_g}g · F {plan.summary.macros?.fat_g}g
              </span>
            </p>
            <p className="mt-1 text-xs uppercase text-muted-foreground">
              {plan.summary.dietStyle} · {plan.summary.goal}
            </p>
          </CardContent>
        </Card>
      )}

      {(plan?.weeks ?? []).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[...(plan?.weeks ?? [])]
            .sort((a: any, b: any) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0))
            .map((week: any) => (
              <Button
                key={`jump-${week.weekNumber}`}
                variant="outline"
                size="sm"
                onClick={() =>
                  document
                    .getElementById(`week-${week.weekNumber}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Week {week.weekNumber}
              </Button>
            ))}
        </div>
      )}

      {[...(plan?.weeks ?? [])]
        .sort((a: any, b: any) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0))
        .map((week: any) => (
        <div key={week.weekNumber} id={`week-${week.weekNumber}`} className="scroll-mt-24 space-y-3">
          <h3 className="text-lg font-bold">Week {week.weekNumber}</h3>
          {[...(week.days ?? [])]
            .sort((a: any, b: any) => (a.day ?? 0) - (b.day ?? 0))
            .map((day: any) => (
            <Card key={day.day}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold">Day {day.day}</p>
                  <p className="text-xs text-muted-foreground">{day.totals?.calories ?? "-"} kcal</p>
                </div>
                <div className="space-y-3">
                  {(day.meals ?? []).map((meal: any, index: number) => (
                    <div key={index} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">
                          <Utensils className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                          {meal.name}: {meal.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 font-semibold">
                  <ShoppingBasket className="mr-1.5 inline h-4 w-4 text-primary" />
                  Grocery list — week {week.weekNumber}
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
      ))}

      {plan?.rationale && (
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold">Why this plan fits you</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.rationale}</p>
          </CardContent>
        </Card>
      )}
      {plan?.disclaimer && <p className="text-xs text-muted-foreground">{plan.disclaimer}</p>}
    </div>
  );
}