import * as React from 'react'
import {
  Body,
  Button,
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
  stage?: 'questionnaire' | 'checkout'
  resumeUrl?: string
}

const Email = ({ name, stage = 'checkout', resumeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your SmartyDiet plan is one step away</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          <span style={{ color: '#2563eb' }}>SMARTY</span>
          <span style={{ color: '#22c55e' }}>DIET</span>
        </Text>
        <Heading style={h1}>
          {name ? `${name}, your plan is almost ready` : 'Your plan is almost ready'}
        </Heading>
        <Text style={text}>
          {stage === 'questionnaire'
            ? 'You started your questionnaire but never finished it. Your answers are still saved — pick up exactly where you left off.'
            : 'You finished your questionnaire but never completed the last step. Your answers are still saved, so your personalized plan can be generated in minutes.'}
        </Text>
        <Button href={resumeUrl || 'https://smartydiet.com/questionnaire'} style={button}>
          {stage === 'questionnaire' ? 'Finish my questionnaire' : 'Get my diet plan'}
        </Button>
        <Text style={small}>
          One-time €9.99 — includes your full meal plan, macros, grocery list, 1 refinement and
          PDF export. No subscription.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          SmartyDiet — part of the Smarty Wellness family of brands. Not medical advice.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your SmartyDiet plan is one step away',
  displayName: 'Abandoned checkout reminder',
  previewData: { name: 'Jane', stage: 'checkout', resumeUrl: 'https://smartydiet.com/questionnaire' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const brand = { fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const small = { fontSize: '13px', lineHeight: '20px', color: '#64748b', margin: '16px 0 0' }
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderRadius: '9999px',
  fontSize: '15px',
  fontWeight: 700,
  padding: '12px 24px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8' }
