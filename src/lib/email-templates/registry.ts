import type { ComponentType } from 'react'

import { template as abandonedCheckout } from './abandoned-checkout'
import { template as contactConfirmation } from './contact-confirmation'
import { template as contactNotification } from './contact-notification'
import { template as leadWelcome } from './lead-welcome'
import { template as planGenerationFailure } from './plan-generation-failure'
import { template as planDelayCustomer } from './plan-delay-customer'
import { template as planReadyCustomer } from './plan-ready-customer'
import { template as supportReply } from './support-reply'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'abandoned-checkout': abandonedCheckout,
  'contact-confirmation': contactConfirmation,
  'contact-notification': contactNotification,
  'lead-welcome': leadWelcome,
  'plan-generation-failure': planGenerationFailure,
  'plan-delay-customer': planDelayCustomer,
  'plan-ready-customer': planReadyCustomer,
  'support-reply': supportReply,
}
