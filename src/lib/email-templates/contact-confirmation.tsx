import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  subject?: string
  message?: string
}

const Email = ({ name, subject, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message — SmartyDiet support</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          <span style={{ color: '#2563eb' }}>SMARTY</span>
          <span style={{ color: '#22c55e' }}>DIET</span>
        </Text>
        <Heading style={h1}>Thanks for reaching out{name ? `, ${name}` : ''}</Heading>
        <Text style={text}>
          We received your message and our team will get back to you as soon as possible.
        </Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Subject</Text>
          <Text style={text}>{subject || '(no subject)'}</Text>
          <Text style={label}>Your message</Text>
          <Text style={quote}>{message || ''}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>SmartyDiet — part of the Smarty Wellness family of brands.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your message — SmartyDiet',
  displayName: 'Contact confirmation',
  previewData: {
    name: 'Jane',
    subject: 'Question about meal plans',
    message: 'How many plans can I generate?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const brand = { fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 12px' }
const label = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.6px',
  color: '#64748b',
  margin: '12px 0 4px',
}
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
