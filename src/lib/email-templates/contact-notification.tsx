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
  email?: string
  subject?: string
  message?: string
  isReply?: boolean
  threadId?: string
}

const Email = ({ name, email, subject, message, isReply }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isReply ? 'New reply' : 'New message'} from {name || email || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{isReply ? 'New support reply' : 'New support message'}</Heading>
        <Text style={text}>
          <strong>From:</strong> {name || '(no name)'} &lt;{email || 'unknown'}&gt;
        </Text>
        <Text style={text}>
          <strong>Subject:</strong> {subject || '(no subject)'}
        </Text>
        <Hr style={hr} />
        <Text style={quote}>{message || ''}</Text>
        <Hr style={hr} />
        <Text style={footer}>SmartyDiet support</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[SmartyDiet] ${data?.isReply ? 'Reply' : 'New message'}: ${data?.subject || '(no subject)'}`,
  displayName: 'Contact notification (admin)',
  previewData: {
    name: 'Jane',
    email: 'jane@example.com',
    subject: 'Question about meal plans',
    message: 'How many plans can I generate?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '20px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 8px' }
const quote = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#334155',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid #2563eb',
  paddingLeft: '12px',
  margin: '0',
}
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8' }
