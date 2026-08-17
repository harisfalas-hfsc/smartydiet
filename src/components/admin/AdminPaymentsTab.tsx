import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { adminSetFreeAccessMode } from "@/lib/free-access.functions";
import { fetchFreeAccessMode, setFreeAccessModeCache } from "@/hooks/useFreeAccessMode";
import { cn } from "@/lib/utils";

export function AdminPaymentsTab() {
  const setMode = useServerFn(adminSetFreeAccessMode);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchFreeAccessMode(true).then(setEnabled);
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    const prev = enabled;
    setEnabled(next);
    const res = await setMode({ data: { enabled: next } });
    setBusy(false);
    if (res && "error" in res) {
      setEnabled(prev ?? false);
      toast.error(res.error);
      return;
    }
    setFreeAccessModeCache(next);
    toast.success(
      next
        ? "Free Access Mode ON — All content is free for signed-in members. Every price, purchase button and premium page is hidden everywhere."
        : "Free Access Mode OFF — Normal paid mode restored. Existing subscriptions were never touched.",
    );
  }

  const active = enabled === true;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-2xl border-2 bg-card p-5",
          active ? "border-amber-500 bg-amber-500/5" : "border-blue-400",
        )}
      >
        <div className="flex items-center gap-2">
          <Lock className={cn("h-5 w-5", active ? "text-amber-500" : "text-primary")} />
          <h2 className="text-base font-extrabold">Global Free Access Mode</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Master switch. When ON, every signed-in member gets full premium access and the
          whole app becomes free-only: no prices, no purchase buttons, no premium or
          corporate pages, no &quot;buy on the website&quot; notices. Nothing in the payment
          provider changes and existing subscriptions keep billing — flip it back any time.
        </p>

        <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold">Make the entire app free</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use this for App Store / Play Store review when a reviewer must not see any
              purchase path at all.
            </p>
          </div>
          {enabled === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Switch checked={active} disabled={busy} onCheckedChange={(v) => void toggle(v)} />
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current state:</span>
          <Badge variant={active ? "destructive" : "secondary"}>
            {active ? "EVERYTHING FREE" : "NORMAL PAID MODE"}
          </Badge>
        </div>
      </div>

      {active && (
        <div className="rounded-xl border-2 border-amber-500 bg-amber-500/10 p-4 text-sm font-semibold text-amber-600">
          Free Access Mode is ON. It overrides everything below — purchases are forced OFF on
          iOS, Android and web, no matter what these switches say.
        </div>
      )}
    </div>
  );
}
