/**
 * Email Infrastructure Module
 *
 * Centralized email sending via Resend with pre-built templates
 * for SaaS notifications and client portal (Bridge) communications.
 *
 * Usage:
 *   import { sendEmail, sendClientInviteEmail } from '@/app/_lib/email'
 */

// Core email sending
export { sendEmail } from "@/libs/resend";

// SaaS subscription emails
export {
  sendSaasPaymentFailedEmail,
  sendSaasCanceledEmail,
  sendSaasSubscriptionConfirmationEmail,
} from "@/libs/saas-emails";

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
} from "@/libs/bridge-emails";

// Types
export type { StudioBranding } from "@/libs/bridge-emails";
