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

// Marketing email brand tokens
export {
  MARKETING_AURORA_GRADIENT,
  MARKETING_AURORA_GRADIENT_VERTICAL,
  MARKETING_EMAIL_COLORS,
  MARKETING_EMAIL_FONTS,
  SALT_WORDMARK_PATH,
  saltWordmarkImgHtml,
} from "@/app/_lib/email/marketing-email-brand";

// Waitlist emails
export {
  buildWaitlistAdminNotificationEmail,
  buildWaitlistConfirmationEmail,
  getWaitlistNotifyRecipients,
  sendWaitlistAdminNotificationEmail,
  sendWaitlistConfirmationEmail,
  WAITLIST_CONFIRMATION_PREVIEW,
  WAITLIST_CONFIRMATION_SUBJECT,
} from "@/app/_lib/email/waitlist-emails";

// Types
export type { StudioBranding } from "@/app/_lib/email/roundtables-emails";
