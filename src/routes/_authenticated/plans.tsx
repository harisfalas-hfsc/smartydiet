import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "My plans — SmartyDiet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansList,
});

interface Row {
  id: string;
  duration_weeks: number;
  status: string;
  credits_used: number;
  credits_total: number;
  created_at: string;
}

function PlansList() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("generation_sessions")
        .select("id,duration_weeks,status,credits_used,credits_total,created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My plans</h1>
        <Button asChild size="sm">
          <Link to="/questionnaire">New plan</Link>
        </Button>
      </div>
      {rows === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
            You don't have any plans yet.
            <div className="mt-4">
              <Button asChild>
                <Link to="/questionnaire">Build my first plan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              to="/plans/$sessionId"
              params={{ sessionId: r.id }}
              className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{r.duration_weeks}-week plan</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} · {r.credits_used}/{r.credits_total}{" "}
                    credits used
                  </p>
                </div>
                <span className="text-sm text-primary">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
