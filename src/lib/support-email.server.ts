// Server-only email helpers for the support system.
// All sends go through `safeSend` so an email failure never breaks a support action.

export const SUPPORT_ADMIN_EMAIL = "smartydiet@outlook.com";

export type SupportEmailTemplate =
  | "contact-confirmation"
  | "contact-notification"
  | "support-reply";

type SendArgs = {
  templateName: SupportEmailTemplate;
  recipientEmail: string;
  idempotencyKey?: string;
  replyTo?: string;
  templateData?: Record<string, unknown>;
};

/**
 * Lovable managed email is only available once a verified sender domain is
 * configured for this project. Until then this resolves to `false` and sends
 * are skipped (logged) instead of throwing.
 */
function emailConfigured(): boolean {
  return Boolean(process.env["SENDER_DOMAIN"]);
}

async function send(args: SendArgs): Promise<void> {
  const origin =
    process.env["PUBLIC_SITE_URL"] ??
    process.env["SITE_URL"] ??
    "https://smartydiet.com";

  const res = await fetch(`${origin}/lovable/email/transactional/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? ""}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`email send failed: ${res.status}`);
}

export async function safeSend(args: SendArgs): Promise<void> {
  try {
    if (!emailConfigured()) {
      console.warn(
        `[support-email] skipped ${args.templateName} to ${args.recipientEmail} — no verified sender domain configured`,
      );
      return;
    }
    await send(args);
  } catch (e) {
    console.error("[support-email] send failed", args.templateName, e);
  }
}
