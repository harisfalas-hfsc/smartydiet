import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MacroGrams = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type Props = {
  macros: MacroGrams;
  showLabels?: boolean;
  size?: "sm" | "md";
  className?: string;
};

const MACRO_META = {
  protein: {
    label: "Protein",
    color: "bg-chart-1",
    text: "text-chart-1",
    tip: "Protein builds and repairs muscle and helps keep you full.",
  },
  carbs: {
    label: "Carbs",
    color: "bg-chart-3",
    text: "text-chart-3",
    tip: "Carbohydrates are your body's main source of quick energy.",
  },
  fat: {
    label: "Fat",
    color: "bg-chart-4",
    text: "text-chart-4",
    tip: "Fat supports hormones, nutrient absorption, and long-lasting energy.",
  },
};

function MacroTooltip({
  macro,
  value,
  children,
}: {
  macro: keyof typeof MACRO_META;
  value: number;
  children: React.ReactNode;
}) {
  const meta = MACRO_META[macro];
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-center">
        <p className="font-semibold">{meta.label}: {value}g</p>
        <p className="text-[11px] opacity-90">{meta.tip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MacroBar({ macros, showLabels = true, size = "md", className }: Props) {
  const protein = Math.max(0, Number(macros?.protein_g) || 0);
  const carbs = Math.max(0, Number(macros?.carbs_g) || 0);
  const fat = Math.max(0, Number(macros?.fat_g) || 0);
  const total = protein + carbs + fat || 1;

  const pPct = (protein / total) * 100;
  const cPct = (carbs / total) * 100;
  const fPct = (fat / total) * 100;

  const barHeight = size === "sm" ? "h-2" : "h-3";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <TooltipProvider>
      <div className={cn("w-full", className)}>
        <div
          className={cn(
            "flex w-full overflow-hidden rounded-full border border-border/50",
            barHeight,
          )}
          aria-label="Macro breakdown bar"
          role="img"
        >
          <MacroTooltip macro="protein" value={protein}>
            <div
              className={cn("cursor-help", MACRO_META.protein.color)}
              style={{ width: `${pPct}%`, minWidth: protein > 0 ? "4px" : "0px" }}
            />
          </MacroTooltip>
          <MacroTooltip macro="carbs" value={carbs}>
            <div
              className={cn("cursor-help", MACRO_META.carbs.color)}
              style={{ width: `${cPct}%`, minWidth: carbs > 0 ? "4px" : "0px" }}
            />
          </MacroTooltip>
          <MacroTooltip macro="fat" value={fat}>
            <div
              className={cn("cursor-help", MACRO_META.fat.color)}
              style={{ width: `${fPct}%`, minWidth: fat > 0 ? "4px" : "0px" }}
            />
          </MacroTooltip>
        </div>

        {showLabels && (
          <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1", textSize)}>
            <MacroTooltip macro="protein" value={protein}>
              <span className="inline-flex cursor-help items-center gap-1 font-medium">
                <span className={cn("h-2 w-2 rounded-full", MACRO_META.protein.color)} />
                Protein {protein}g
              </span>
            </MacroTooltip>
            <MacroTooltip macro="carbs" value={carbs}>
              <span className="inline-flex cursor-help items-center gap-1 font-medium">
                <span className={cn("h-2 w-2 rounded-full", MACRO_META.carbs.color)} />
                Carbs {carbs}g
              </span>
            </MacroTooltip>
            <MacroTooltip macro="fat" value={fat}>
              <span className="inline-flex cursor-help items-center gap-1 font-medium">
                <span className={cn("h-2 w-2 rounded-full", MACRO_META.fat.color)} />
                Fat {fat}g
              </span>
            </MacroTooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export function CalorieTooltip({
  calories,
  children,
}: {
  calories: number;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="font-semibold">{calories} kcal</p>
          <p className="text-[11px] opacity-90">
            Calories measure the energy your food provides.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MacroInfoIcon({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className={cn("h-3.5 w-3.5 cursor-help text-muted-foreground", className)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          <p className="text-[11px] opacity-90">
            Protein builds muscle, carbs provide quick energy, and fat supports hormones and
            long-lasting energy.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
