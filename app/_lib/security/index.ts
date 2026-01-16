/**
 * Security Infrastructure Module
 *
 * Secure token generation, URL validation, and safe redirects.
 *
 * Usage:
 *   import { generateSecureToken, safeStripeHostedUrl } from '@/app/_lib/security'
 */

// Token utilities
export {
  generateSecureToken,
  hashToken,
  verifyTokenHash,
  generateTokenWithHash,
} from "@/libs/tokens";

// Safe URL utilities
export {
  safeSameOriginAbsoluteUrl,
  safeStripeHostedUrl,
  safeHttpUrl,
} from "@/libs/safe-url";

// Safe redirect utilities
export { safeRedirectPath } from "@/libs/safe-redirect";

// Bridge invoice tokens (higher-level token management)
export {
  issueInvoiceToken,
  verifyInvoiceToken,
  revokeInvoiceTokens,
  markTokenSpentForCheckout,
  buildInvoiceTokenUrl,
} from "@/libs/bridge-invoice-tokens";

export type { InvoiceToken, TokenVerificationResult } from "@/libs/bridge-invoice-tokens";
