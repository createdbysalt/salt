/**
 * Email Infrastructure Module
 *
 * Centralized email sending via Resend with pre-built templates
 * for SaaS notifications and Roundtables communications.
 *
 * Usage:
 *   import { sendEmail, sendClientInviteEmail } from '@/app/_lib/email'
 */

// Core email sending
export { sendEmail } from "@/app/_lib/email/resend";

// SaaS subscription emails
export {
  sendSaasPaymentFailedEmail,
  sendSaasCanceledEmail,
  sendSaasSubscriptionConfirmationEmail,
} from "@/app/_lib/email/saas-emails";

// Bridge/Client portal emails
export {
  sendClientInviteEmail,
  sendAccessRestoredEmail,
  sendInviteResentEmail,
  sendAccessRevokedEmail,
  sendInvoicePaymentLinkEmail,
  sendInvoicePaidToStudioEmail,
  sendInvoicePaymentFailedToStudioEmail,
  sendRetainerStatusEmail,
  sendNewMessageEmail,
  getStudioBranding,
} from "@/app/_lib/email/roundtables-emails";

// Types
export type { StudioBranding } from "@/app/_lib/email/roundtables-emails";
