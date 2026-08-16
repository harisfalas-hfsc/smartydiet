import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createStripeClient,
  getStripeErrorMessage,
  type StripeEnv,
} from "@/lib/stripe.server";
import { isAdminEmail } from "@/lib/admin";

async function assertAdmin(ctx: { supabase: any; userId: string; claims: any }) {
  const email = ctx.claims?.email as string | undefined;
  if (isAdminEmail(email)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Forbidden: admin access required");
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  age: number | null;
  credits: number;
  purchases: number;
  created_at: string;
  is_admin: boolean;
  has_active_subscription: boolean;
  subscription_status: string | null;
};

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; environment: StripeEnv }) => data)
  .handler(async ({ context, data }): Promise<{ users: AdminUserRow[] } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Fetch auth users to get email + created_at (paginated up to 1000)
      const authUsersMap = new Map<string, { email: string | null; created_at: string }>();
      let page = 1;
      for (let i = 0; i < 10; i++) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return { error: error.message };
        for (const u of list.users) {
          authUsersMap.set(u.id, { email: u.email ?? null, created_at: u.created_at });
        }
        if (list.users.length < 200) break;
        page++;
      }

      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, bonus_credits, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (pErr) return { error: pErr.message };

      const ids = (profiles ?? []).map((p: any) => p.id);
      const filterIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

      const [{ data: roles }, { data: sessions }, { data: questionnaires }] = await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", filterIds),
        supabaseAdmin
          .from("generation_sessions")
          .select("user_id, status")
          .in("user_id", filterIds),
        supabaseAdmin
          .from("questionnaires")
          .select("user_id, data")
          .in("user_id", filterIds),
      ]);

      const adminByUser = new Set<string>();
      for (const r of (roles ?? []) as any[]) if (r.role === "admin") adminByUser.add(r.user_id);

      const purchasesByUser = new Map<string, number>();
      for (const s of (sessions ?? []) as any[]) {
        if (s.status === "paid" || s.status === "completed") {
          purchasesByUser.set(s.user_id, (purchasesByUser.get(s.user_id) ?? 0) + 1);
        }
      }

      const ageByUser = new Map<string, number>();
      for (const q of (questionnaires ?? []) as any[]) {
        const age = q?.data?.age;
        if (typeof age === "number" && !ageByUser.has(q.user_id)) ageByUser.set(q.user_id, age);
      }

      let users: AdminUserRow[] = (profiles ?? []).map((p: any) => {
        const auth = authUsersMap.get(p.id);
        return {
          id: p.id,
          email: auth?.email ?? "",
          name: p.display_name ?? "",
          age: ageByUser.get(p.id) ?? null,
          credits: p.bonus_credits ?? 0,
          purchases: purchasesByUser.get(p.id) ?? 0,
          created_at: p.created_at,
          is_admin: isAdminEmail(auth?.email) || adminByUser.has(p.id),
          has_active_subscription: false,
          subscription_status: null,
        };
      });

      if (data.search) {
        const q = data.search.trim().toLowerCase();
        users = users.filter((u) => u.email.toLowerCase().includes(q));
      }

      return { users };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to list users" };
    }
  });

export const adminGrantCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; credits: number }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true; credits: number } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      if (!data.userId || !Number.isFinite(data.credits) || data.credits === 0)
        return { error: "Invalid input" };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("bonus_credits")
        .eq("id", data.userId)
        .maybeSingle();
      if (!p) return { error: "User not found" };
      const next = Math.max(0, ((p as any).bonus_credits ?? 0) + data.credits);
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ bonus_credits: next })
        .eq("id", data.userId);
      if (error) return { error: error.message };
      return { ok: true, credits: next };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; makeAdmin: boolean }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.makeAdmin) {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) return { error: error.message };
      } else {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .eq("role", "admin");
        if (error) return { error: error.message };
      }
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export type AdminPurchaseRow = {
  id: string;
  created: string;
  amount: number;
  currency: string;
  email: string | null;
  description: string | null;
  status: string;
  type: "payment" | "subscription";
};

export type AdminAnalytics = {
  environment: StripeEnv;
  totalRevenue: number;
  currency: string;
  paymentsCount: number;
  activeSubscriptions: number;
  productPurchases: number;
  subscriptionPurchases: number;
  revenueByMonth: Array<{ month: string; amount: number }>;
  recent: AdminPurchaseRow[];
};

export const adminGetStripeAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ context, data }): Promise<AdminAnalytics | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const stripe = createStripeClient(data.environment);
      const charges: any[] = [];
      let starting_after: string | undefined;
      for (let i = 0; i < 3; i++) {
        const page: any = await stripe.charges.list({
          limit: 100,
          ...(starting_after ? { starting_after } : {}),
        });
        charges.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1]?.id;
      }
      const paid = charges.filter((c) => c.paid && c.status === "succeeded" && !c.refunded);
      const currency = paid[0]?.currency?.toUpperCase() ?? "EUR";
      const totalRevenue = paid.reduce((s, c) => s + (c.amount ?? 0), 0) / 100;
      const byMonth = new Map<string, number>();
      let productCount = 0;
      let subCount = 0;
      for (const c of paid) {
        const d = new Date((c.created ?? 0) * 1000);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        byMonth.set(key, (byMonth.get(key) ?? 0) + (c.amount ?? 0) / 100);
        if (c.invoice) subCount++;
        else productCount++;
      }
      const revenueByMonth = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));
      const activeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
      const recent: AdminPurchaseRow[] = paid.slice(0, 30).map((c) => ({
        id: c.id,
        created: new Date((c.created ?? 0) * 1000).toISOString(),
        amount: (c.amount ?? 0) / 100,
        currency: (c.currency ?? "eur").toUpperCase(),
        email: c.billing_details?.email ?? c.receipt_email ?? null,
        description: c.description ?? null,
        status: c.status,
        type: c.invoice ? "subscription" : "payment",
      }));
      return {
        environment: data.environment,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        currency,
        paymentsCount: paid.length,
        activeSubscriptions: activeSubs.data.length,
        productPurchases: productCount,
        subscriptionPurchases: subCount,
        revenueByMonth,
        recent,
      };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

export type AdminSessionRow = {
  id: string;
  user_id: string;
  email: string | null;
  status: string;
  duration_weeks: number;
  credits_total: number;
  credits_used: number;
  amount_cents: number;
  currency: string;
  created_at: string;
};

export const adminListSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId?: string; search?: string }) => data)
  .handler(async ({ context, data }): Promise<{ sessions: AdminSessionRow[] } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let q = supabaseAdmin
        .from("generation_sessions")
        .select("id, user_id, status, duration_weeks, credits_total, credits_used, amount_cents, currency, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (data.userId) q = q.eq("user_id", data.userId);
      const { data: sessions, error } = await q;
      if (error) return { error: error.message };

      const emails = new Map<string, string | null>();
      let page = 1;
      for (let i = 0; i < 5; i++) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        const users = list?.users ?? [];
        for (const u of users) emails.set(u.id, u.email ?? null);
        if (users.length < 200) break;
        page++;
      }

      let rows: AdminSessionRow[] = (sessions ?? []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        email: emails.get(s.user_id) ?? null,
        status: s.status,
        duration_weeks: s.duration_weeks,
        credits_total: s.credits_total,
        credits_used: s.credits_used,
        amount_cents: s.amount_cents,
        currency: s.currency,
        created_at: s.created_at,
      }));

      if (data.search) {
        const term = data.search.trim().toLowerCase();
        rows = rows.filter((r) => (r.email ?? "").toLowerCase().includes(term));
      }
      return { sessions: rows };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to list plans" };
    }
  });

export type AdminStats = {
  members: number;
  newMembers30d: number;
  plansTotal: number;
  plansCompleted: number;
  paidSessions: number;
  creditsOutstanding: number;
  admins: number;
  threads: number;
};

export const adminGetStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: profiles }, { data: sessions }, { data: roles }, { count: threads }] =
        await Promise.all([
          supabaseAdmin.from("profiles").select("id, created_at, bonus_credits").limit(5000),
          supabaseAdmin
            .from("generation_sessions")
            .select("status, credits_total, credits_used")
            .limit(5000),
          supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
          supabaseAdmin.from("support_threads").select("id", { count: "exact", head: true }),
        ]);

      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const all = (sessions ?? []) as any[];
      return {
        members: (profiles ?? []).length,
        newMembers30d: (profiles ?? []).filter(
          (p: any) => new Date(p.created_at).getTime() >= cutoff,
        ).length,
        plansTotal: all.length,
        plansCompleted: all.filter((s) => s.status === "completed").length,
        paidSessions: all.filter((s) => s.status === "paid" || s.status === "completed").length,
        creditsOutstanding: all.reduce(
          (sum, s) => sum + Math.max(0, (s.credits_total ?? 0) - (s.credits_used ?? 0)),
          0,
        ),
        admins: (roles ?? []).length,
        threads: threads ?? 0,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load stats" };
    }
  });
