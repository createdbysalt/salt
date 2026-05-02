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
} from "@/app/_lib/security/tokens";

// Safe URL utilities
export {
  safeSameOriginAbsoluteUrl,
  safeStripeHostedUrl,
  safeHttpUrl,
} from "@/app/_lib/security/safe-url";

// Safe redirect utilities
export { safeRedirectPath } from "@/app/_lib/security/safe-redirect";

// Bridge invoice tokens (higher-level token management)
export {
  issueInvoiceToken,
  verifyInvoiceToken,
  revokeInvoiceTokens,
  markTokenSpentForCheckout,
  buildInvoiceTokenUrl,
} from "@/app/_lib/email/table-invoice-tokens";

export type { InvoiceToken, TokenVerificationResult } from "@/app/_lib/email/table-invoice-tokens";
