/**
 * Purchase channel abstraction — ONE codebase, two billing rails.
 *
 * Web / installed PWA  → Stripe embedded checkout (what runs today).
 * iOS / Android native → Apple In-App Purchase / Google Play Billing.
 *   Apple and Google require digital goods to be sold through their own
 *   billing, and forbid linking out to a web checkout from inside the app.
 *   Until the native purchase bridge ships, the native build must show a
 *   neutral notice instead of a Stripe form — never a link to the website.
 *
 * Nothing else in the app branches on platform: it asks for the channel and
 * renders accordingly.
 */

import { getPlatform, hasNativeBridge } from "@/lib/platform";

export type PurchaseChannel = "stripe" | "native-iap" | "unavailable";

/** Product identifiers, kept identical across Stripe and the app stores. */
export const PRODUCT_IDS = {
  dietPlan: "diet_plan_onetime",
} as const;

/** Store product ids to register in App Store Connect / Play Console. */
export const STORE_PRODUCT_IDS = {
  dietPlan: "com.smartydiet.plan.onetime",
} as const;

/** True when a native in-app-purchase plugin is present in this build. */
export function hasNativePurchaseBridge(): boolean {
  return hasNativeBridge("InAppPurchase") || hasNativeBridge("Purchases");
}

export function getPurchaseChannel(): PurchaseChannel {
  const platform = getPlatform();
  if (platform === "ios" || platform === "android") {
    return hasNativePurchaseBridge() ? "native-iap" : "unavailable";
  }
  return "stripe";
}

export const NATIVE_PURCHASE_UNAVAILABLE_MESSAGE =
  "Purchases are not available in this version of the app yet. Your questionnaire is saved — you can generate your plan as soon as in-app purchases are enabled.";
