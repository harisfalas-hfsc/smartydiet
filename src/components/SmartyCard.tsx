import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type SmartyTone =
  | "cyan"
  | "green"
  | "orange"
  | "purple"
  | "yellow"
  | "pink"
  | "blue";

const TONE: Record<
  SmartyTone,
  { border: string; text: string; softBg: string; softBorder: string }
> = {
  cyan: {
    border: "border-sky-400",
    text: "text-sky-500",
    softBg: "bg-sky-50",
    softBorder: "border-sky-200",
  },
  green: {
    border: "border-emerald-400",
    text: "text-emerald-500",
    softBg: "bg-emerald-50",
    softBorder: "border-emerald-200",
  },
  orange: {
    border: "border-orange-400",
    text: "text-orange-500",
    softBg: "bg-orange-50",
    softBorder: "border-orange-200",
  },
  purple: {
    border: "border-violet-400",
    text: "text-violet-500",
    softBg: "bg-violet-50",
    softBorder: "border-violet-200",
  },
  yellow: {
    border: "border-amber-400",
    text: "text-amber-500",
    softBg: "bg-amber-50",
    softBorder: "border-amber-200",
  },
  pink: {
    border: "border-pink-400",
    text: "text-pink-500",
    softBg: "bg-pink-50",
    softBorder: "border-pink-200",
  },
  blue: {
    border: "border-blue-400",
    text: "text-blue-500",
    softBg: "bg-blue-50",
    softBorder: "border-blue-200",
  },
};

export function toneClasses(tone: SmartyTone) {
  return TONE[tone];
}

interface SmartyCardProps {
  tone?: SmartyTone;
  eyebrow?: string;
  eyebrowIcon?: LucideIcon | string; // Lucide icon component or emoji
  cornerIcon?: LucideIcon | string;
  title?: ReactNode;
  accent?: ReactNode; // colored trailing word appended to title
  description?: ReactNode;
  children?: ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
  ctaHref?: string;
  className?: string;
}

function IconOrEmoji({
  icon,
  className,
}: {
  icon: LucideIcon | string;
  className?: string;
}) {
  if (typeof icon === "string") {
    return <span className={cn("text-lg leading-none", className)}>{icon}</span>;
  }
  const Comp = icon;
  return <Comp className={cn("h-4 w-4", className)} />;
}

export function SmartyCard({
  tone = "cyan",
  eyebrow,
  eyebrowIcon,
  cornerIcon,
  title,
  accent,
  description,
  children,
  ctaLabel,
  ctaTo,
  ctaHref,
  className,
}: SmartyCardProps) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border-2 bg-card p-6 shadow-soft sm:p-8",
        t.border,
        className,
      )}
    >
      {(eyebrow || cornerIcon) && (
        <div className="flex items-start justify-between gap-3">
          {eyebrow ? (
            <div
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider",
                t.softBorder,
                t.text,
              )}
            >
              {eyebrowIcon && <IconOrEmoji icon={eyebrowIcon} className="h-3.5 w-3.5" />}
              {eyebrow}
            </div>
          ) : (
            <span />
          )}
          {cornerIcon && (
            <div
              className={cn(
                "grid h-9 w-9 flex-none place-items-center rounded-xl border",
                t.softBorder,
                t.softBg,
                t.text,
              )}
            >
              <IconOrEmoji icon={cornerIcon} className="h-4 w-4 text-lg" />
            </div>
          )}
        </div>
      )}


      {title && (
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
          {accent && <span className={cn(" ", t.text)}> {accent}</span>}
        </h2>
      )}

      {description && (
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">{description}</p>
      )}

      {children && <div className="mt-5">{children}</div>}

      {ctaLabel && (ctaTo || ctaHref) && (
        <div className="mt-6">
          {ctaTo ? (
            <Link
              to={ctaTo as never}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold",
                t.text,
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <a
              href={ctaHref}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold",
                t.text,
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface SmartyRowProps {
  icon?: LucideIcon | string;
  title: string;
  subtitle?: string;
  tone?: SmartyTone;
}

export function SmartyRow({ icon, title, subtitle, tone = "cyan" }: SmartyRowProps) {
  const t = TONE[tone];
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div
          className={cn(
            "grid h-9 w-9 flex-none place-items-center rounded-lg border",
            t.softBorder,
            t.softBg,
            t.text,
          )}
        >
          <IconOrEmoji icon={icon} className="h-4 w-4 text-base" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

interface SmartyPillProps {
  tone?: SmartyTone;
  icon?: LucideIcon | string;
  children: ReactNode;
}

export function SmartyPill({ tone = "cyan", icon, children }: SmartyPillProps) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card p-3",
        t.softBorder,
      )}
    >
      {icon && (
        <div className={cn("grid h-7 w-7 flex-none place-items-center rounded-lg", t.softBg, t.text)}>
          <IconOrEmoji icon={icon} className="h-3.5 w-3.5 text-sm" />
        </div>
      )}
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}
