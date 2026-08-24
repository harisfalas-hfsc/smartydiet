import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const Email = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to SmartyDiet — free nutrition tools inside</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>
          <span style={{ color: '#2563eb' }}>SMARTY</span>
          <span style={{ color: '#22c55e' }}>DIET</span>
        </Text>
        <Heading style={h1}>You&apos;re on the list</Heading>
        <Text style={text}>
          Thanks for joining SmartyDiet. We&apos;ll send you practical nutrition tips and new
          features — no spam, and you can stop any time.
        </Text>
        <Text style={text}>
          While you&apos;re here, our calculators are completely free:
        </Text>
        <Text style={text}>
          <Link href="https://smartydiet.com/tools" style={link}>
            BMR, macro and calorie tools →
          </Link>
        </Text>
        <Text style={text}>
          Ready for a full personalized plan?{' '}
          <Link href="https://smartydiet.com/questionnaire" style={link}>
            Start the questionnaire
          </Link>
          .
        </Text>
        <Hr style={hr} />
        <Text style={footer}>SmartyDiet — part of the Smarty Wellness family of brands.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to SmartyDiet',
  displayName: 'Lead welcome',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const brand = { fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 12px' }
const link = { color: '#2563eb', fontWeight: 700 }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#94a3b8' }
