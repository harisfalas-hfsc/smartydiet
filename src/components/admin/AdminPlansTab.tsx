import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminListDietAttempts, adminListSessions, type AdminDietAttempt, type AdminSessionRow } from "@/lib/admin.functions";
import { attemptOutcomeIsFailure, attemptOutcomeLabel } from "@/lib/attempt-outcomes";
import { PlanContent } from "@/components/plans/PlanContent";

export function AdminPlansTab({ userId, title }: { userId?: string; title?: string }) {
  const listSessions = useServerFn(adminListSessions);
  const listAttempts = useServerFn(adminListDietAttempts);
  const [rows, setRows] = useState<AdminSessionRow[]>([]);
  const [attempts, setAttempts] = useState<AdminDietAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<AdminDietAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const [r, a] = await Promise.all([
      listSessions({ data: { userId, search: search.trim() || undefined } }),
      listAttempts({} as never),
    ]);
    if ("error" in r) setError(r.error);
    else if ("error" in a) setError(a.error);
    else {
      setRows(r.sessions);
      setAttempts(a.attempts.filter((attempt) =>
        (!userId || attempt.user_id === userId) &&
        (!search.trim() || (attempt.email ?? "").toLowerCase().includes(search.trim().toLowerCase())),
      ));
    }
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
      ) : (
        <Tabs defaultValue="generated" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generated">Generated diets ({rows.length})</TabsTrigger>
            <TabsTrigger value="attempts">Attempts ({attempts.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="generated" className="space-y-3">
          {rows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No diet plans yet.</p> : (
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
                      <div className="mt-4">
                        <PlanContent plan={version.plan} durationWeeks={s.duration_weeks} showDownloads />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          ))}
          </div>)}
          </TabsContent>
          <TabsContent value="attempts" className="space-y-3">
            {!attempts.length ? <p className="py-10 text-center text-sm text-muted-foreground">No checkout or generation attempts recorded.</p> : attempts.map((attempt) => (
              <button key={attempt.id} type="button" onClick={() => setSelectedAttempt(attempt)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50">
                <span className="min-w-0"><span className="block truncate font-semibold">{attempt.email || attempt.user_id}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(attempt.checkout_opened_at).toLocaleString()} · {attempt.reached_stage}</span></span>
                <Badge variant={attemptOutcomeIsFailure(attempt.status) ? "destructive" : "secondary"}>
                  {attemptOutcomeLabel(attempt.status, attempt.failure_kind)}
                </Badge>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      )}
      <Dialog open={!!selectedAttempt} onOpenChange={(open) => !open && setSelectedAttempt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Diet plan attempt</DialogTitle><DialogDescription>{selectedAttempt?.email || selectedAttempt?.user_id}</DialogDescription></DialogHeader>
          {selectedAttempt && <div className="space-y-4 text-sm">
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><div><p className="font-semibold">{attemptOutcomeLabel(selectedAttempt.status, selectedAttempt.failure_kind)}</p><p className="mt-1 text-muted-foreground">{selectedAttempt.failure_reason || "Checkout was opened, but no completed payment was recorded."}</p></div></div>
            <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Outcome</dt><dd className="font-medium">{attemptOutcomeLabel(selectedAttempt.status, selectedAttempt.failure_kind)}</dd></div><div><dt className="text-xs text-muted-foreground">Last stage</dt><dd className="font-medium">{selectedAttempt.reached_stage}</dd></div><div><dt className="text-xs text-muted-foreground">Checkout opened</dt><dd className="font-medium">{new Date(selectedAttempt.checkout_opened_at).toLocaleString()}</dd></div><div><dt className="text-xs text-muted-foreground">Payment code</dt><dd className="font-medium">{selectedAttempt.payment_failure_code || "Not provided"}</dd></div><div><dt className="text-xs text-muted-foreground">Alert email</dt><dd className="font-medium">{selectedAttempt.email_status ? `${selectedAttempt.email_status}${selectedAttempt.email_dispatched_at ? ` · ${new Date(selectedAttempt.email_dispatched_at).toLocaleString()}` : ""}` : "Not sent"}</dd></div>{selectedAttempt.email_message_id && <div><dt className="text-xs text-muted-foreground">Message reference</dt><dd className="break-all font-medium">{selectedAttempt.email_message_id}</dd></div>}</dl>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
