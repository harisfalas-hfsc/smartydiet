import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  author_name: string;
  author_context: string | null;
  quote: string;
  rating: number;
};

/**
 * Real member testimonials, managed from Admin → Growth.
 * Renders nothing at all until at least one testimonial is approved, so the
 * page never shows invented social proof.
 */
export function Testimonials({ className }: { className?: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    void supabase
      .from("testimonials")
      .select("id, author_name, author_context, quote, rating")
      .eq("approved", true)
      .order("sort_order", { ascending: true })
      .limit(6)
      .then(({ data }) => {
        if (active) setRows((data ?? []) as Row[]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <section className={cn("mt-10", className)} aria-label="What members say">
      <h2 className="text-center text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
        What members say
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <figure key={r.id} className="rounded-2xl border border-blue-400 bg-card p-5">
            <div className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
              {Array.from({ length: r.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
              “{r.quote}”
            </blockquote>
            <figcaption className="mt-3 text-xs font-bold text-muted-foreground">
              {r.author_name}
              {r.author_context ? ` — ${r.author_context}` : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const FACTS: { label: string; detail: string }[] = [
  { label: "One-time €9.99", detail: "No subscription, no auto-renewal" },
  { label: "1 free refinement", detail: "Adjust your plan after you see it" },
  { label: "Yours to keep", detail: "PDF export + saved to your account" },
  { label: "Private by design", detail: "Your data, deletable any time" },
];

/** Factual trust strip — verifiable claims only, no invented numbers. */
export function TrustBar({ className }: { className?: string }) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {FACTS.map((f) => (
        <div key={f.label} className="rounded-2xl border border-blue-400 bg-card p-4">
          <p className="text-sm font-extrabold">{f.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
        </div>
      ))}
    </section>
  );
}
