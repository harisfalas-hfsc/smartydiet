// Server-only email helpers for the support system.
// All sends go through `safeSend` so an email failure never breaks a support action.

import { sendTemplateEmail } from "@/lib/email-templates/send-email";

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

export async function safeSend(args: SendArgs): Promise<void> {
  try {
    const result = await sendTemplateEmail(args.templateName, args.recipientEmail, {
      templateData: args.templateData,
      idempotencyKey: args.idempotencyKey,
      replyTo: args.replyTo,
    });
    if (!result.sent) {
      console.warn(
        `[support-email] skipped ${args.templateName} to ${args.recipientEmail} — ${result.reason}`,
      );
    }
  } catch (e) {
    console.error("[support-email] send failed", args.templateName, e);
  }
}
