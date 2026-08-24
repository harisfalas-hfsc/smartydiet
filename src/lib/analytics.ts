/**
 * Thin, safe wrapper around the Google Analytics gtag queue.
 * No-ops during SSR or when the tag hasn't loaded, so callers never need guards.
 */
type GtagParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params: GtagParams = {}) {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag !== "function") return;
    w.gtag("event", name, params);
  } catch {
    /* analytics must never break the app */
  }
}

/** Funnel step helpers — names follow GA4 recommended events where one exists. */
export const analytics = {
  signUp: () => trackEvent("sign_up", { method: "email" }),
  login: () => trackEvent("login", { method: "email" }),
  questionnaireStart: () => trackEvent("questionnaire_start"),
  questionnaireComplete: (weeks: number) =>
    trackEvent("questionnaire_complete", { duration_weeks: weeks }),
  beginCheckout: (weeks: number) =>
    trackEvent("begin_checkout", { currency: "EUR", value: 9.99, duration_weeks: weeks }),
  purchase: (transactionId: string) =>
    trackEvent("purchase", { transaction_id: transactionId, currency: "EUR", value: 9.99 }),
  planReady: (free: boolean) => trackEvent("plan_generated", { free_access: free }),
};
