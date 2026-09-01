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
  planUrl?: string
}

const Email = ({ name, planUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Good news — your SmartyDiet plan is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          <span style={{ color: '#2563eb' }}>SMARTY</span>
          <span style={{ color: '#22c55e' }}>DIET</span>
        </Text>
        <Heading style={h1}>
          {name ? `${name}, your plan is ready` : 'Your plan is ready'}
        </Heading>
        <Text style={text}>
          Thank you for your patience. The issue that delayed your plan is resolved and your
          personalized diet plan has now been created — complete with your meals, macros and
          grocery list.
        </Text>
        <Button href={planUrl || 'https://smartydiet.com/plans'} style={button}>
          Open my diet plan
        </Button>
        <Text style={small}>
          Your refinement is still available, so you can ask for one adjustment whenever you want.
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
  subject: 'Your SmartyDiet plan is ready',
  displayName: 'Plan ready after delay (customer)',
  previewData: { name: 'Jane', planUrl: 'https://smartydiet.com/plans' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const brand = { fontSize: '18px', fontWeight: 800, letterSpacing: '1px', margin: '0 0 18px' }
const h1 = { color: '#0f172a', fontSize: '23px', lineHeight: '32px', margin: '0 0 14px' }
const text = { color: '#334155', fontSize: '15px', lineHeight: '25px', margin: '0 0 14px' }
const button = {
  backgroundColor: '#22c55e',
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
