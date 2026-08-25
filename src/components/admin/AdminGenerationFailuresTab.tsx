import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, Loader2, Mail, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminListGenerationFailures,
  adminMarkGenerationFailureRead,
  adminSendGenerationFailureTest,
  type AdminGenerationFailure,
} from "@/lib/admin.functions";

export function AdminGenerationFailuresTab() {
  const listFailures = useServerFn(adminListGenerationFailures);
  const markRead = useServerFn(adminMarkGenerationFailureRead);
  const sendTest = useServerFn(adminSendGenerationFailureTest);
  const [rows, setRows] = useState<AdminGenerationFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await listFailures({ data: {} } as never);
    if ("error" in result) setError(result.error);
    else setRows(result.failures);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={async () => {
          const result = await sendTest({} as never);
          if ("error" in result) setError(result.error);
          else await load();
        }}>Send test failure email</Button>
      </div>
      {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">No generation failures recorded.</p>}
      {rows.map((failure) => (
        <article key={failure.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{failure.email || failure.user_id}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(failure.occurred_at).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={failure.email_status === "accepted" ? "default" : "destructive"}>
                {failure.email_status === "accepted" ? <Mail className="mr-1 h-3 w-3" /> : <MailWarning className="mr-1 h-3 w-3" />}
                Email {failure.email_status}
              </Badge>
              {!failure.read_at && (
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Mark failure as read"
                  title="Mark as read"
                  onClick={async () => {
                    await markRead({ data: { id: failure.id } });
                    setRows((current) => current.map((row) => row.id === failure.id ? { ...row, read_at: new Date().toISOString() } : row));
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">{failure.stage}</p>
              <p className="mt-1 break-words text-muted-foreground">{failure.reason}</p>
              {failure.email_error && <p className="mt-2 text-xs text-destructive">Email: {failure.email_error}</p>}
            </div>
          </div>
          <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {failure.session_id && <div><dt className="inline font-semibold">Session: </dt><dd className="inline">{failure.session_id}</dd></div>}
            {failure.questionnaire_id && <div><dt className="inline font-semibold">Questionnaire: </dt><dd className="inline">{failure.questionnaire_id}</dd></div>}
          </dl>
        </article>
      ))}
    </div>
  );
}