import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, ServerCrash } from "lucide-react";
import {
  getConnectivityState,
  probeBackend,
  subscribeConnectivityState,
  type ConnectivityState,
} from "@/lib/offline/connectivity";
import { readSyncMeta, type SyncMeta } from "@/lib/offline/store";
import { getOfflineSession } from "@/lib/offline/credentials";
import { runBackgroundSync, subscribeSyncing } from "@/lib/offline/sync";

function relative(ts: number | null) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/**
 * Small, non-blocking connectivity/sync pill. It never covers navigation and
 * never intercepts pointer events outside its own footprint.
 */
export function SyncStatusPill() {
  const [state, setState] = useState<ConnectivityState>("online");
  const [syncing, setSyncing] = useState(false);
  const [meta, setMeta] = useState<SyncMeta | null>(null);
  const [expanded, setExpanded] = useState(false);

  const refreshMeta = useCallback(async () => {
    const uid = getOfflineSession()?.user.id ?? null;
    setMeta(await readSyncMeta(uid));
  }, []);

  useEffect(() => {
    setState(getConnectivityState());
    void refreshMeta();
    const unsubState = subscribeConnectivityState((s) => {
      setState(s);
      void refreshMeta();
    });
    const unsubSync = subscribeSyncing((busy) => {
      setSyncing(busy);
      if (!busy) void refreshMeta();
    });
    return () => {
      unsubState();
      unsubSync();
    };
  }, [refreshMeta]);

  const degraded = state !== "online";
  const pending = meta?.pending ?? 0;
  if (!degraded && !syncing && pending === 0) return null;

  const label = degraded
    ? state === "offline"
      ? "Offline"
      : "Server unavailable"
    : syncing
      ? "Syncing…"
      : `${pending} waiting to sync`;

  const Icon = state === "server-unreachable" ? ServerCrash : degraded ? CloudOff : RefreshCw;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[55] print:hidden">
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          void probeBackend(true);
          if (!degraded) void runBackgroundSync();
        }}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur"
      >
        <Icon className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {label}
      </button>

      {expanded && (
        <div className="pointer-events-auto mt-2 w-[min(80vw,260px)] rounded-xl border border-border bg-card p-3 text-xs shadow-lg">
          <p className="text-muted-foreground">
            {state === "offline"
              ? "No internet. Everything saved on this device is still available."
              : state === "server-unreachable"
                ? "Internet is working but our servers aren't answering. Saved content still works."
                : "Connected."}
          </p>
          <p className="mt-2 text-muted-foreground">
            Last sync: {relative(meta?.lastSuccessAt ?? null) ?? "not yet"}
          </p>
          {pending > 0 && <p className="text-muted-foreground">Pending changes: {pending}</p>}
          {(meta?.failed ?? 0) > 0 && (
            <p className="text-muted-foreground">Failed: {meta?.failed}</p>
          )}
          <button
            type="button"
            onClick={() => void runBackgroundSync(true)}
            disabled={degraded || syncing}
            className="mt-2 w-full rounded-lg border border-border px-2 py-1 font-semibold disabled:opacity-50"
          >
            {degraded ? "Will sync automatically" : "Sync now"}
          </button>
        </div>
      )}
    </div>
  );
}
