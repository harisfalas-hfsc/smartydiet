import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    const { data } = await db
      .from("notifications")
      .select("id,kind,title,body,read_at,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = ((data as AppNotification[] | null) ?? []) as AppNotification[];
    return { notifications: rows, unread: rows.filter((r) => !r.read_at).length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });

/** Marks a specific set of notifications read or unread. */
export const setNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; read: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true };
    const db = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    await db
      .from("notifications")
      .update({ read_at: data.read ? new Date().toISOString() : null } as never)
      .eq("user_id", context.userId)
      .in("id", data.ids);
    return { ok: true };
  });

/** Permanently deletes the given notifications. */
export const deleteNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true };
    const db = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    await db.from("notifications").delete().eq("user_id", context.userId).in("id", data.ids);
    return { ok: true };
  });
