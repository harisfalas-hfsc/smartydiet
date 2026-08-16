import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  subject?: string
  reply?: string
}

const Email = ({ name, subject, reply }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>SmartyDiet replied to your message</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          <span style={{ color: '#2563eb' }}>SMARTY</span>
          <span style={{ color: '#22c55e' }}>DIET</span>
        </Text>
        <Heading style={h1}>Hi{name ? ` ${name}` : ''}, we replied</Heading>
        <Text style={text}>
          Re: {subject || 'your message'}
        </Text>
        <Hr style={hr} />
        <Text style={quote}>{reply || ''}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          You can reply to this email or continue the conversation in your SmartyDiet inbox.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Re: ${data?.subject || 'your message'} — SmartyDiet support`,
  displayName: 'Support reply',
  previewData: {
    name: 'Jane',
    subject: 'Question about meal plans',
    reply: 'You can generate a new plan any time after purchase.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const brand = { fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 12px' }
const quote = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#334155',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid #22c55e',
  paddingLeft: '12px',
  margin: '0',
}
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8' }
