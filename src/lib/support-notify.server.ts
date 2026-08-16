import { safeSend, SUPPORT_ADMIN_EMAIL } from "@/lib/support-email.server";

const OWNER_EMAILS = [SUPPORT_ADMIN_EMAIL, "harisfalas@gmail.com"];

async function resolveAdminUserIds(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ids = new Set<string>();

  try {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    for (const r of (roles ?? []) as Array<{ user_id: string }>) ids.add(r.user_id);
  } catch {
    /* ignore */
  }

  try {
    let page = 1;
    for (let i = 0; i < 5; i++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      const users = list?.users ?? [];
      for (const u of users) {
        if (u.email && OWNER_EMAILS.includes(u.email.toLowerCase())) ids.add(u.id);
      }
      if (users.length < 200) break;
      page++;
    }
  } catch {
    /* ignore */
  }

  return [...ids];
}

export async function notifyAdminsOfInboundMessage(args: {
  threadId: string;
  messageId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isReply?: boolean;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    const adminIds = await resolveAdminUserIds();
    if (adminIds.length) {
      const rows = adminIds.map((user_id) => ({
        user_id,
        kind: "support",
        title: args.isReply
          ? `New reply from ${args.name || args.email}`
          : `New message from ${args.name || args.email}`,
        body: `${args.subject}\n\n${args.message.slice(0, 400)}`,
        dedupe_key: `support:${args.messageId}`,
      }));
      await supabaseAdmin.from("notifications").upsert(rows, {
        onConflict: "user_id,dedupe_key",
        ignoreDuplicates: true,
      });
    }
  } catch (e) {
    console.error("[support-notify] admin notification insert failed", e);
  }

  await safeSend({
    templateName: "contact-notification",
    recipientEmail: SUPPORT_ADMIN_EMAIL,
    replyTo: args.email,
    idempotencyKey: `support-inbound-${args.messageId}`,
    templateData: {
      name: args.name,
      email: args.email,
      subject: args.subject,
      message: args.message,
      isReply: Boolean(args.isReply),
      threadId: args.threadId,
    },
  });
}
