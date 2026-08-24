import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  adminDeleteTestimonial,
  adminListGrowth,
  adminSaveTestimonial,
  type LeadRow,
  type Testimonial,
} from "@/lib/growth.functions";

export function AdminGrowthTab() {
  const load = useServerFn(adminListGrowth);
  const save = useServerFn(adminSaveTestimonial);
  const remove = useServerFn(adminDeleteTestimonial);

  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [form, setForm] = useState({ author_name: "", author_context: "", quote: "" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await load({ data: {} } as never);
    setLoading(false);
    if (!res || "error" in (res as object)) {
      toast.error((res as { error?: string })?.error ?? "Failed to load");
      return;
    }
    const ok = res as { testimonials: Testimonial[]; leads: LeadRow[] };
    setTestimonials(ok.testimonials);
    setLeads(ok.leads);
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    if (!form.author_name.trim() || !form.quote.trim()) {
      toast.error("Name and quote are required.");
      return;
    }
    setBusy(true);
    const res = await save({ data: { ...form, approved: true } });
    setBusy(false);
    if (res && "error" in res) return toast.error(res.error);
    setForm({ author_name: "", author_context: "", quote: "" });
    toast.success("Testimonial added and published.");
    void refresh();
  }

  async function toggleApproved(t: Testimonial, approved: boolean) {
    setTestimonials((prev) => prev.map((x) => (x.id === t.id ? { ...x, approved } : x)));
    const res = await save({
      data: {
        id: t.id,
        author_name: t.author_name,
        author_context: t.author_context ?? "",
        quote: t.quote,
        rating: t.rating,
        approved,
        sort_order: t.sort_order,
      },
    });
    if (res && "error" in res) {
      toast.error(res.error);
      void refresh();
    }
  }

  async function del(id: string) {
    const res = await remove({ data: { id } });
    if (res && "error" in res) return toast.error(res.error);
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
  }

  function exportLeads() {
    const csv = ["email,source,created_at"]
      .concat(leads.map((l) => `${l.email},${l.source},${l.created_at}`))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "smartydiet-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-400 bg-card p-5">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-base font-extrabold">Testimonials</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Only published testimonials appear on the site. Use real member feedback —
          nothing shows until you add it.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
            placeholder="Name (e.g. Maria K.)"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.author_context}
            onChange={(e) => setForm({ ...form, author_context: e.target.value })}
            placeholder="Context (e.g. lost 6 kg in 8 weeks)"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.quote}
          onChange={(e) => setForm({ ...form, quote: e.target.value })}
          placeholder="What they said…"
          rows={3}
          className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm"
        />
        <Button className="mt-3" onClick={() => void add()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add testimonial
        </Button>

        <div className="mt-5 space-y-3">
          {testimonials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No testimonials yet.</p>
          ) : (
            testimonials.map((t) => (
              <div key={t.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {t.author_name}
                      {t.author_context ? ` — ${t.author_context}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">“{t.quote}”</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={t.approved}
                      onCheckedChange={(v) => void toggleApproved(t, v)}
                      aria-label="Published"
                    />
                    <button
                      type="button"
                      onClick={() => void del(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete testimonial"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-400 bg-card p-5">
        <h2 className="text-base font-extrabold">Email list ({leads.length})</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Visitors who left their email without buying yet.
        </p>
        {leads.length > 0 && (
          <Button variant="outline" size="sm" className="mt-3" onClick={exportLeads}>
            Export CSV
          </Button>
        )}
        <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
          {leads.map((l) => (
            <div key={l.id} className="flex justify-between gap-3 text-sm">
              <span className="truncate">{l.email}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{l.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
