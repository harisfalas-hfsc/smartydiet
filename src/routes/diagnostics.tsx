/**
 * Development / QA offline diagnostics.
 *
 * Not linked anywhere in the product UI. In a production build it only opens
 * with ?qa=1 so normal customers never see technical internals.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SmartyCard } from "@/components/SmartyCard";
import { getConnectivityState, probeBackend } from "@/lib/offline/connectivity";
import { getOfflineSessionAsync } from "@/lib/offline/credentials";
import { OFFLINE_KEYS, LOCAL_DB_VERSION, readCached, readSyncMeta } from "@/lib/offline/store";
import { runBackgroundSync } from "@/lib/offline/sync";
import { getApiOrigin, getPlatform, isNativePlatform, isStandalone } from "@/lib/platform";

export const Route = createFileRoute("/diagnostics")({
  component: DiagnosticsPage,
  head: () => ({
    meta: [
      { title: "SmartyDiet diagnostics" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal offline diagnostics for SmartyDiet QA." },
    ],
  }),
});

type Row = { label: string; value: string };

function fmt(ts: number | null | undefined) {
  return ts ? new Date(ts).toLocaleString() : "never";
}

function DiagnosticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [allowed, setAllowed] = useState(true);

  const collect = useCallback(async () => {
    const out: Row[] = [];
    out.push({ label: "Platform", value: getPlatform() });
    out.push({ label: "Native WebView", value: String(isNativePlatform()) });
    out.push({ label: "Installed (standalone)", value: String(isStandalone()) });
    out.push({ label: "API origin", value: getApiOrigin() || "same origin" });
    out.push({ label: "Connectivity", value: getConnectivityState() });

    let registered = false;
    let active = false;
    let controlling = false;
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const reg = regs.find((r) => (r.active ?? r.waiting ?? r.installing) != null);
      registered = Boolean(reg);
      active = Boolean(reg?.active);
      controlling = Boolean(navigator.serviceWorker.controller);
    }
    out.push({ label: "Service worker registered", value: String(registered) });
    out.push({ label: "Service worker active", value: String(active) });
    out.push({ label: "Service worker controlling page", value: String(controlling) });

    if ("caches" in window) {
      const names = await caches.keys();
      for (const name of names) {
        const count = (await (await caches.open(name)).keys()).length;
        out.push({ label: `Cache "${name}"`, value: `${count} entries` });
      }
    }

    out.push({ label: "IndexedDB available", value: String(typeof indexedDB !== "undefined") });
    out.push({ label: "Local DB version", value: String(LOCAL_DB_VERSION) });

    const session = await getOfflineSessionAsync();
    out.push({ label: "Local user", value: session?.user.email ?? "none" });
    out.push({ label: "Local display name", value: session?.user.displayName ?? "none" });
    out.push({
      label: "Avatar cached",
      value: String(Boolean(session?.user.avatarUrl?.startsWith("data:"))),
    });

    const uid = session?.user.id ?? null;
    const profile = await readCached(OFFLINE_KEYS.profile, uid);
    const sessions = await readCached<unknown[]>(OFFLINE_KEYS.sessions, uid);
    const questionnaires = await readCached<unknown[]>(OFFLINE_KEYS.questionnaires, uid);
    const notifications = await readCached<unknown[]>(OFFLINE_KEYS.notifications, uid);
    out.push({ label: "Profile cached", value: String(Boolean(profile)) });
    out.push({ label: "Plans cached", value: String(sessions?.length ?? 0) });
    out.push({ label: "Questionnaires cached", value: String(questionnaires?.length ?? 0) });
    out.push({ label: "Notifications cached", value: String(notifications?.length ?? 0) });

    // Structured local database (Dexie) — the real proof data is on device.
    const stats = await collectDbStats(uid);
    for (const stat of stats) {
      out.push({
        label: `DB table "${stat.table}"`,
        value:
          `${stat.rows} rows` +
          (stat.lastSyncedAt ? ` · synced ${fmt(stat.lastSyncedAt)}` : " · never synced"),
      });
    }

    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const mb = (n?: number) => `${((n ?? 0) / 1_048_576).toFixed(2)} MB`;
      out.push({ label: "Storage used", value: `${mb(est.usage)} of ${mb(est.quota)}` });
    }
    if (navigator.storage?.persisted) {
      out.push({ label: "Storage persisted", value: String(await navigator.storage.persisted()) });
    }


    const meta = await readSyncMeta(uid);
    out.push({ label: "Pending operations", value: String(meta.pending) });
    out.push({ label: "Failed operations", value: String(meta.failed) });
    out.push({ label: "Last successful sync", value: fmt(meta.lastSuccessAt) });
    out.push({ label: "Last sync attempt", value: fmt(meta.lastAttemptAt) });
    out.push({ label: "Last sync error", value: meta.lastError ?? "none" });

    setRows(out);
  }, []);

  useEffect(() => {
    const qa = new URLSearchParams(window.location.search).get("qa") === "1";
    if (!import.meta.env.DEV && !qa) {
      setAllowed(false);
      return;
    }
    void collect();
  }, [collect]);

  if (!allowed) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-muted-foreground">Not available.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Offline diagnostics</h1>
      <SmartyCard tone="blue" className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void collect()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void probeBackend(true).then(collect)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"
          >
            Probe backend
          </button>
          <button
            type="button"
            onClick={() => void runBackgroundSync(true).then(collect)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"
          >
            Force sync
          </button>
        </div>
        <dl className="divide-y divide-border text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium break-all">{row.value}</dd>
            </div>
          ))}
        </dl>
      </SmartyCard>
    </main>
  );
}
