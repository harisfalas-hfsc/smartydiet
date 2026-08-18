import { createFileRoute } from "@tanstack/react-router";

/**
 * Tiny reachability probe used by the offline layer to tell
 * "device has no internet" apart from "backend unreachable".
 * No auth, no database, no PII — just a fast 200.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }),
      HEAD: async () =>
        new Response(null, { status: 200, headers: { "cache-control": "no-store" } }),
    },
  },
});
