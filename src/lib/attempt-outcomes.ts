export type GenerationFailureKind = "ai_balance" | "technical";

const AI_BALANCE_PATTERNS = [
  /credit balance/i,
  /insufficient (?:credit|balance|quota)/i,
  /(?:credit|quota|balance).*(?:exhausted|exceeded|unavailable)/i,
  /(?:billing|payment) required/i,
  /resource_exhausted/i,
  /status 402/i,
  /(?:tokens?|requests?).*(?:left|remaining).*(?:0|zero)/i,
  /(?:0|zero).*(?:tokens?|requests?).*(?:left|remaining)/i,
  /exceeded your current quota/i,
];

export function classifyGenerationFailure(reason: string): GenerationFailureKind {
  return AI_BALANCE_PATTERNS.some((pattern) => pattern.test(reason)) ? "ai_balance" : "technical";
}

export function generationFailureLabel(kind: GenerationFailureKind): string {
  return kind === "ai_balance"
    ? "Generation failed — no AI balance"
    : "Generation failed — technical issue";
}

export function attemptOutcomeLabel(status: string, failureKind?: string | null): string {
  if (status === "payment_declined" || failureKind === "payment_declined") {
    return "Payment failed — card declined";
  }
  if (status === "payment_cancelled" || failureKind === "checkout_abandoned") {
    return "Checkout pending / abandoned";
  }
  if (status === "generation_failed") {
    return generationFailureLabel(failureKind === "ai_balance" ? "ai_balance" : "technical");
  }
  if (status === "generated") return "Generated";
  if (status === "paid" || status === "payment_processing") return "Payment completed — generating";
  return "Checkout pending / abandoned";
}

export function attemptOutcomeIsFailure(status: string): boolean {
  return status === "payment_declined" || status === "generation_failed";
}