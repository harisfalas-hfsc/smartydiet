import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin";

export type SupportMessage = {
  id: string;
  thread_id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
};

export type SupportThread = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  status: string;
  last_message_at: string;
  admin_unread: boolean;
  user_unread: boolean;
  created_at: string;
  messages?: SupportMessage[];
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

type Ctx = { supabase: any; userId: string; claims: any };

async function assertAdmin(ctx: Ctx) {
  const email = ctx.claims?.email as string | undefined;
  if (isAdminEmail(email) || email?.toLowerCase() === "smartydiet@outlook.com") return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Forbidden: admin access required");
}

function clean(v: unknown, max = 4000) {
  return String(v ?? "").trim().slice(0, max);
}

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* ------------------------------- public form ------------------------------ */

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; email: string; subject: string; message: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const name = clean(data.name, 120);
    const email = clean(data.email, 200).toLowerCase();
    const subject = clean(data.subject, 200) || "Support request";
    const message = clean(data.message, 8000);
    if (!name || !validEmail(email) || !message) return { error: "Please fill in all fields." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: thread, error } = await supabaseAdmin
      .from("support_threads")
      .insert({ name, email, subject, admin_unread: true, status: "open" })
      .select("id")
      .single();
    if (error || !thread) return { error: error?.message ?? "Could not send your message." };

    const { data: msg } = await supabaseAdmin
      .from("support_messages")
      .insert({ thread_id: thread.id, sender: "user", body: message })
      .select("id")
      .single();

    const { notifyAdminsOfInboundMessage } = await import("@/lib/support-notify.server");
    const { safeSend } = await import("@/lib/support-email.server");
    await notifyAdminsOfInboundMessage({
      threadId: thread.id,
      messageId: msg?.id ?? thread.id,
      name,
      email,
      subject,
      message,
    });
    await safeSend({
      templateName: "contact-confirmation",
      recipientEmail: email,
      idempotencyKey: `contact-confirm-${thread.id}`,
      templateData: { name, subject, message },
    });
    return { ok: true };

  });

/* -------------------------------- member ---------------------------------- */

export const submitMemberMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; message: string; name?: string }) => d)
  .handler(
    async ({ data, context }): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> => {
      const ctx = context as unknown as Ctx;
      const email = clean(ctx.claims?.email, 200).toLowerCase();
      const name = clean(data.name, 120) || email.split("@")[0] || "Member";
      const subject = clean(data.subject, 200) || "Support request";
      const message = clean(data.message, 8000);
      if (!message) return { ok: false, error: "Please write a message." };

      const { data: thread, error } = await ctx.supabase
        .from("support_threads")
        .insert({
          user_id: ctx.userId,
          name,
          email,
          subject,
          admin_unread: true,
          status: "open",
        })
        .select("id")
        .single();
      if (error || !thread) return { ok: false, error: error?.message ?? "Could not send your message." };

      const { data: msg } = await ctx.supabase
        .from("support_messages")
        .insert({ thread_id: thread.id, sender: "user", author_id: ctx.userId, body: message })
        .select("id")
        .single();

      const { notifyAdminsOfInboundMessage } = await import("@/lib/support-notify.server");
      await notifyAdminsOfInboundMessage({
        threadId: thread.id,
        messageId: msg?.id ?? thread.id,
        name,
        email,
        subject,
        message,
      });

      // Confirmation back to the member: email + in-app notification.
      if (validEmail(email)) {
        const { safeSend } = await import("@/lib/support-email.server");
        await safeSend({
          templateName: "contact-confirmation",
          recipientEmail: email,
          idempotencyKey: `contact-confirm-${thread.id}`,
          templateData: { name, subject, message },
        });
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("notifications").insert({
        user_id: ctx.userId,
        title: "We received your message",
        body: `Thanks for reaching out about "${subject}". Our team replies within 24–48 hours.`,
      });

      return { ok: true, threadId: thread.id };
    },
  );

export const listMyThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ threads: SupportThread[] }> => {
    const ctx = context as unknown as Ctx;
    const { data: threads } = await ctx.supabase
      .from("support_threads")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("user_deleted", false)
      .order("last_message_at", { ascending: false })
      .limit(100);
    const ids = (threads ?? []).map((t: any) => t.id);
    const byThread = new Map<string, SupportMessage[]>();
    if (ids.length) {
      const { data: msgs } = await ctx.supabase
        .from("support_messages")
        .select("id, thread_id, sender, body, created_at")
        .in("thread_id", ids)
        .order("created_at", { ascending: true });
      for (const m of (msgs ?? []) as SupportMessage[]) {
        const arr = byThread.get(m.thread_id) ?? [];
        arr.push(m);
        byThread.set(m.thread_id, arr);
      }
    }
    return {
      threads: (threads ?? []).map((t: any) => ({ ...t, messages: byThread.get(t.id) ?? [] })),
    };
  });

export const replyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { threadId: string; body: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const ctx = context as unknown as Ctx;
    const message = clean(data.body, 8000);
    if (!message) return { ok: false, error: "Please write a message." };

    const { data: thread } = await ctx.supabase
      .from("support_threads")
      .select("id, name, email, subject, user_id")
      .eq("id", data.threadId)
      .maybeSingle();
    if (!thread || thread.user_id !== ctx.userId) return { ok: false, error: "Conversation not found." };

    const { data: msg, error } = await ctx.supabase
      .from("support_messages")
      .insert({ thread_id: thread.id, sender: "user", author_id: ctx.userId, body: message })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await ctx.supabase
      .from("support_threads")
      .update({ admin_unread: true, status: "open", last_message_at: new Date().toISOString() })
      .eq("id", thread.id);

    const { notifyAdminsOfInboundMessage } = await import("@/lib/support-notify.server");
    await notifyAdminsOfInboundMessage({
      threadId: thread.id,
      messageId: msg?.id ?? thread.id,
      name: thread.name,
      email: thread.email,
      subject: thread.subject,
      message,
      isReply: true,
    });
    return { ok: true };
  });

export const setThreadsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; read: boolean }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const ctx = context as unknown as Ctx;
    if (!data.ids?.length) return { ok: true };
    const { error } = await ctx.supabase
      .from("support_threads")
      .update({ user_unread: !data.read })
      .in("id", data.ids)
      .eq("user_id", ctx.userId);
    return { ok: !error };
  });

export const deleteMyThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const ctx = context as unknown as Ctx;
    if (!data.ids?.length) return { ok: true };
    const { error } = await ctx.supabase
      .from("support_threads")
      .update({ user_deleted: true })
      .in("id", data.ids)
      .eq("user_id", ctx.userId);
    return { ok: !error };
  });

/* ----------------------------- notifications ------------------------------ */

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ notifications: AppNotification[]; unread: number }> => {
    const ctx = context as unknown as Ctx;
    const { data } = await ctx.supabase
      .from("notifications")
      .select("id, kind, title, body, read_at, created_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const notifications = (data ?? []) as AppNotification[];
    return { notifications, unread: notifications.filter((n) => !n.read_at).length };
  });

export const setNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; read: boolean }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const ctx = context as unknown as Ctx;
    if (!data.ids?.length) return { ok: true };
    const { error } = await ctx.supabase
      .from("notifications")
      .update({ read_at: data.read ? new Date().toISOString() : null })
      .in("id", data.ids)
      .eq("user_id", ctx.userId);
    return { ok: !error };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", ctx.userId)
      .is("read_at", null);
    return { ok: !error };
  });

export const deleteNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const ctx = context as unknown as Ctx;
    if (!data.ids?.length) return { ok: true };
    const { error } = await ctx.supabase
      .from("notifications")
      .delete()
      .in("id", data.ids)
      .eq("user_id", ctx.userId);
    return { ok: !error };
  });

/* --------------------------------- admin ---------------------------------- */

export const adminListThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => d)
  .handler(async ({ data, context }): Promise<{ threads: SupportThread[] } | { error: string }> => {
    try {
      const ctx = context as unknown as Ctx;
      await assertAdmin(ctx);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let query = supabaseAdmin
        .from("support_threads")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200);
      const s = clean(data.search, 100);
      if (s) query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`);
      const { data: threads, error } = await query;
      if (error) return { error: error.message };

      const ids = (threads ?? []).map((t: any) => t.id);
      const byThread = new Map<string, SupportMessage[]>();
      if (ids.length) {
        const { data: msgs } = await supabaseAdmin
          .from("support_messages")
          .select("id, thread_id, sender, body, created_at")
          .in("thread_id", ids)
          .order("created_at", { ascending: true });
        for (const m of (msgs ?? []) as unknown as SupportMessage[]) {
          const arr = byThread.get(m.thread_id) ?? [];
          arr.push(m);
          byThread.set(m.thread_id, arr);
        }
      }
      return {
        threads: (threads ?? []).map((t: any) => ({ ...t, messages: byThread.get(t.id) ?? [] })),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminReplyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { threadId: string; message: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const ctx = context as unknown as Ctx;
      await assertAdmin(ctx);
      const message = clean(data.message, 8000);
      if (!message) return { error: "Please write a reply." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: thread } = await supabaseAdmin
        .from("support_threads")
        .select("id, name, email, subject, user_id")
        .eq("id", data.threadId)
        .maybeSingle();
      if (!thread) return { error: "Conversation not found." };

      const { error } = await supabaseAdmin
        .from("support_messages")
        .insert({ thread_id: thread.id, sender: "admin", author_id: ctx.userId, body: message });
      if (error) return { error: error.message };

      await supabaseAdmin
        .from("support_threads")
        .update({
          admin_unread: false,
          user_unread: true,
          status: "answered",
          last_message_at: new Date().toISOString(),
        })
        .eq("id", thread.id);

      if (thread.user_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: thread.user_id,
          kind: "support",
          title: "SmartyDiet replied to your message",
          body: message.slice(0, 400),
          dedupe_key: `support-reply:${thread.id}:${Date.now()}`,
        });
      }

      const { safeSend } = await import("@/lib/support-email.server");
      await safeSend({
        templateName: "support-reply",
        recipientEmail: thread.email,
        templateData: { name: thread.name, subject: thread.subject, reply: message },
      });
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminSetThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { threadIds: string[]; read?: boolean; status?: string; remove?: boolean }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const ctx = context as unknown as Ctx;
      await assertAdmin(ctx);
      if (!data.threadIds?.length) return { ok: true };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.remove) {
        const { error } = await supabaseAdmin
          .from("support_threads")
          .delete()
          .in("id", data.threadIds);
        if (error) return { error: error.message };
        return { ok: true };
      }
      const patch: { admin_unread?: boolean; status?: string } = {};
      if (typeof data.read === "boolean") patch.admin_unread = !data.read;
      if (data.status) patch.status = data.status;
      if (!Object.keys(patch).length) return { ok: true };
      const { error } = await supabaseAdmin
        .from("support_threads")
        .update(patch)
        .in("id", data.threadIds);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminUnreadMessageCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ count: number } | { error: string }> => {
    try {
      const ctx = context as unknown as Ctx;
      await assertAdmin(ctx);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count, error } = await supabaseAdmin
        .from("support_threads")
        .select("id", { count: "exact", head: true })
        .eq("admin_unread", true);
      if (error) return { error: error.message };
      return { count: count ?? 0 };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; audience: "all" | "subscribers" }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true; sent: number } | { error: string }> => {
    try {
      const ctx = context as unknown as Ctx;
      await assertAdmin(ctx);
      const title = clean(data.title, 160);
      const body = clean(data.body, 2000);
      if (!title) return { error: "Title is required." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let userIds: string[] = [];
      if (data.audience === "subscribers") {
        const { data: sessions } = await supabaseAdmin
          .from("generation_sessions")
          .select("user_id, status")
          .in("status", ["paid", "completed"])
          .limit(5000);
        userIds = [...new Set((sessions ?? []).map((s: any) => s.user_id))];
      } else {
        const { data: profiles } = await supabaseAdmin.from("profiles").select("id").limit(5000);
        userIds = (profiles ?? []).map((p: any) => p.id);
      }
      if (!userIds.length) return { ok: true, sent: 0 };

      const key = `broadcast:${Date.now()}`;
      let sent = 0;
      for (let i = 0; i < userIds.length; i += 500) {
        const batch = userIds.slice(i, i + 500).map((user_id) => ({
          user_id,
          kind: "announcement",
          title,
          body,
          dedupe_key: key,
        }));
        const { error } = await supabaseAdmin.from("notifications").insert(batch);
        if (error) return { error: error.message };
        sent += batch.length;
      }
      return { ok: true, sent };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });
