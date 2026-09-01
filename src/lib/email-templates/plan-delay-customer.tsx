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
  plansUrl?: string
}

const Email = ({ name, plansUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A short delay with your SmartyDiet plan — we are on it</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          <span style={{ color: '#2563eb' }}>SMARTY</span>
          <span style={{ color: '#22c55e' }}>DIET</span>
        </Text>
        <Heading style={h1}>
          {name ? `${name}, your plan is taking a little longer` : 'Your plan is taking a little longer'}
        </Heading>
        <Text style={text}>
          We hit a temporary snag while building your personalized plan. Nothing is lost: your
          payment and all your questionnaire answers are safely stored.
        </Text>
        <Text style={text}>
          Our system is already retrying automatically, and our team has been alerted. You will
          receive another email from us the moment your plan is ready — there is nothing you need
          to do.
        </Text>
        <Button href={plansUrl || 'https://smartydiet.com/plans'} style={button}>
          View my plans
        </Button>
        <Text style={small}>
          If you have any question in the meantime, just reply to this email or contact us through
          the site and we will help you personally.
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
  subject: 'A short delay with your SmartyDiet plan — we are on it',
  displayName: 'Plan delayed (customer)',
  previewData: { name: 'Jane', plansUrl: 'https://smartydiet.com/plans' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const brand = { fontSize: '18px', fontWeight: 800, letterSpacing: '1px', margin: '0 0 18px' }
const h1 = { color: '#0f172a', fontSize: '23px', lineHeight: '32px', margin: '0 0 14px' }
const text = { color: '#334155', fontSize: '15px', lineHeight: '25px', margin: '0 0 14px' }
const button = {
  backgroundColor: '#2563eb',
  borderRadius: '10px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 700,
  padding: '13px 24px',
  textDecoration: 'none',
  margin: '6px 0 16px',
}
const small = { color: '#64748b', fontSize: '13px', lineHeight: '21px' }
const hr = { borderColor: '#e2e8f0', margin: '22px 0 14px' }
const footer = { color: '#94a3b8', fontSize: '12px', lineHeight: '19px' }
