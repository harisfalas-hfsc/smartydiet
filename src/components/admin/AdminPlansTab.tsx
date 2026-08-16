import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Search } from "lucide-react";
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
            <div key={s.id} className="rounded-2xl border border-blue-400 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{s.email || s.user_id}</p>
                <Badge variant={s.status === "completed" ? "default" : "outline"}>{s.status}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <span>{s.duration_weeks} week(s)</span>
                <span>
                  Credits: {s.credits_used}/{s.credits_total}
                </span>
                <span>
                  {(s.amount_cents / 100).toFixed(2)} {s.currency.toUpperCase()}
                </span>
                <span>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
