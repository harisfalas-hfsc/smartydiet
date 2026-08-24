import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Testimonial = {
  id: string;
  author_name: string;
  author_context: string | null;
  quote: string;
  rating: number;
  approved: boolean;
  sort_order: number;
  created_at: string;
};

export type LeadRow = {
  id: string;
  email: string;
  source: string;
  created_at: string;
};

/**
 * Public: stores an email address for follow-up (nutrition tips / launch news)
 * and sends a single welcome email. Never reveals whether the email already
 * existed.
 */
export const captureLead = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; source?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const { normalizeEmail } = await import("@/lib/growth.server");
    const email = normalizeEmail(data.email ?? "");
    if (!email) return { error: "Please enter a valid email address." };

    const source = (data.source ?? "site").slice(0, 40);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabaseAdmin.from("leads").insert({ email, source });
      if (error && !error.message.includes("duplicate")) return { error: "Could not save your email. Please try again." };
      try {
        const { safeSend } = await import("@/lib/support-email.server");
        await safeSend({
          templateName: "lead-welcome" as never,
          recipientEmail: email,
          idempotencyKey: `lead-welcome:${email}`,
        });
      } catch {
        /* email must never break the signup */
      }
    }

    return { ok: true };
  });

/** Public: approved testimonials, ordered for display. */
export const listApprovedTestimonials = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ testimonials: Testimonial[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("testimonials")
      .select("id, author_name, author_context, quote, rating, approved, sort_order, created_at")
      .eq("approved", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(12);
    return { testimonials: (data ?? []) as Testimonial[] };
  },
);

export const adminListGrowth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ testimonials: Testimonial[]; leads: LeadRow[] } | { error: string }> => {
      try {
        const { assertAdminCaller } = await import("@/lib/growth.server");
        await assertAdminCaller(context.userId, (context.claims as { email?: string })?.email);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [t, l] = await Promise.all([
          supabaseAdmin
            .from("testimonials")
            .select("id, author_name, author_context, quote, rating, approved, sort_order, created_at")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("leads")
            .select("id, email, source, created_at")
            .order("created_at", { ascending: false })
            .limit(500),
        ]);
        return {
          testimonials: (t.data ?? []) as Testimonial[],
          leads: (l.data ?? []) as LeadRow[],
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to load" };
      }
    },
  );

export const adminSaveTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      author_name: string;
      author_context?: string;
      quote: string;
      rating?: number;
      approved?: boolean;
      sort_order?: number;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const { assertAdminCaller } = await import("@/lib/growth.server");
      await assertAdminCaller(context.userId, (context.claims as { email?: string })?.email);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const row = {
        author_name: data.author_name.trim().slice(0, 80),
        author_context: (data.author_context ?? "").trim().slice(0, 120) || null,
        quote: data.quote.trim().slice(0, 600),
        rating: Math.min(5, Math.max(1, data.rating ?? 5)),
        approved: data.approved ?? false,
        sort_order: data.sort_order ?? 0,
      };
      if (!row.author_name || !row.quote) return { error: "Name and quote are required." };
      const { error } = data.id
        ? await supabaseAdmin.from("testimonials").update(row).eq("id", data.id)
        : await supabaseAdmin.from("testimonials").insert(row);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to save" };
    }
  });

export const adminDeleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const { assertAdminCaller } = await import("@/lib/growth.server");
      await assertAdminCaller(context.userId, (context.claims as { email?: string })?.email);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("testimonials").delete().eq("id", data.id);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to delete" };
    }
  });
