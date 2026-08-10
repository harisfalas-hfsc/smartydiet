import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly scheduler: sends the "renews in 3 days" and "renews tomorrow" reminders.
 * Called by pg_cron with the project's publishable key in the `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/billing-run")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;
        try {
          const { runRenewalReminders } = await import("@/lib/billing-notify.server");
          const renewalReminders = await runRenewalReminders(db);
          return Response.json({ ok: true, renewalReminders });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
