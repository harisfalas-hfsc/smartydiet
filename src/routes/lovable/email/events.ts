import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await recordDeliveryOutcome(event.data.message_id, 'bounced')
            },
            'email.complaint': async (event) => {
              await recordDeliveryOutcome(event.data.message_id, 'complaint')
            },
            'email.unsubscribed': async (event) => {
              await recordDeliveryOutcome(event.data.message_id, 'unsubscribed')
            },
            'email.resubscribed': async (event) => {
              await recordDeliveryOutcome(event.data.message_id, 'accepted')
            },
          },
        })
        return handler(request)
      },
    },
  },
})

async function recordDeliveryOutcome(messageId: string, status: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const detail = status === 'accepted' ? null : `Managed email event: ${status}`
  const [failures, attempts] = await Promise.all([
    supabaseAdmin
      .from('plan_generation_failures')
      .update({ email_status: status, email_error: detail })
      .eq('email_message_id', messageId),
    supabaseAdmin
      .from('diet_plan_attempts')
      .update({ email_status: status, email_error: detail })
      .eq('email_message_id', messageId),
  ])
  if (failures.error) throw failures.error
  if (attempts.error) throw attempts.error
}
