import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  userName?: string;
  userEmail?: string;
  userId?: string;
  sessionId?: string;
  stage?: string;
  reason?: string;
  occurredAt?: string;
}

const Email = ({ userName, userEmail, userId, sessionId, stage, reason, occurredAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>SmartyDiet plan generation failed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Diet plan generation failed</Heading>
        <Text style={intro}>A customer could not generate a SmartyDiet plan. Review the failure details below.</Text>
        <Hr style={rule} />
        <Text style={detail}><strong>User:</strong> {userName || "Unknown"}</Text>
        <Text style={detail}><strong>Email:</strong> {userEmail || "Unavailable"}</Text>
        <Text style={detail}><strong>User ID:</strong> {userId || "Unavailable"}</Text>
        <Text style={detail}><strong>Session ID:</strong> {sessionId || "Unavailable"}</Text>
        <Text style={detail}><strong>Stage:</strong> {stage || "Plan generation"}</Text>
        <Text style={detail}><strong>Time:</strong> {occurredAt || "Unavailable"}</Text>
        <Hr style={rule} />
        <Text style={label}>Technical reason</Text>
        <Text style={reasonStyle}>{reason || "Unknown failure"}</Text>
        <Text style={footer}>This is an internal operational alert from SmartyDiet.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `[SmartyDiet alert] Diet generation failed${typeof data.userEmail === "string" ? ` — ${data.userEmail}` : ""}`,
  displayName: "Plan generation failure alert",
  to: "smartydiet@outlook.com",
  previewData: {
    userName: "Jane Doe",
    userEmail: "jane@example.com",
    userId: "user-id",
    sessionId: "session-id",
    stage: "Initial plan generation",
    reason: "AI service returned an error",
    occurredAt: "2026-08-25T20:42:00.000Z",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "24px", maxWidth: "600px" };
const heading = { color: "#991b1b", fontSize: "22px", margin: "0 0 12px" };
const intro = { color: "#334155", fontSize: "15px", lineHeight: "24px" };
const detail = { color: "#334155", fontSize: "14px", lineHeight: "22px", margin: "0 0 5px" };
const label = { color: "#0f172a", fontSize: "14px", fontWeight: 700, margin: "0 0 8px" };
const reasonStyle = { backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#7f1d1d", fontFamily: "monospace", fontSize: "13px", lineHeight: "20px", padding: "12px", whiteSpace: "pre-wrap" as const };
const rule = { borderColor: "#e2e8f0", margin: "18px 0" };
const footer = { color: "#94a3b8", fontSize: "12px", marginTop: "20px" };