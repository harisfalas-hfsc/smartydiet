import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminListSessions, type AdminSessionRow } from "@/lib/admin.functions";

export function AdminPlansTab({ userId, title }: { userId?: string; title?: string }) {
  const listSessions = useServerFn(adminListSessions);
  const [rows, setRows] = useState<AdminSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await listSessions({ data: { userId, search: search.trim() || undefined } });
    if ("error" in r) setError(r.error);
    else setRows(r.sessions);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="space-y-4">
      {title && <p className="text-sm font-semibold">{title}</p>}

      {!userId && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search by member email"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No diet plans yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-card p-4">
              <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{s.email || s.user_id}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{s.versions.length} version{s.versions.length === 1 ? "" : "s"}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="default">Generated</Badge>
                  {openId === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <span>{s.duration_weeks} week(s)</span>
                <span>
                  Refinements left: {Math.max(0, s.credits_total - s.credits_used)}
                </span>
                <span>
                  {(s.amount_cents / 100).toFixed(2)} {s.currency.toUpperCase()}
                </span>
                <span>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              {openId === s.id && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {s.versions.map((version) => (
                    <section key={version.id} className="rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold">Version {version.version}</p>
                        <span className="text-xs text-muted-foreground">{new Date(version.created_at).toLocaleString()}</span>
                      </div>
                      {version.refinement_note && <p className="mt-2 text-sm"><span className="font-semibold">Refinement:</span> {version.refinement_note}</p>}
                      {version.rationale && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{version.rationale}</p>}
                      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs">{JSON.stringify(version.plan, null, 2)}</pre>
                    </section>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
