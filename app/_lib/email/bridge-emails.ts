/**
 * Bridge Email System
 * 
 * White-labelable emails for client users that feel owned by the studio,
 * NOT by Salt Core. These are sent via Resend with studio branding.
 * 
 * Key principles:
 * - Studio name/logo/colors as sender identity
 * - Reply-to goes to studio's support email
 * - Salt Core attribution is optional (default OFF)
 * - Voice follows "the bridge" (never possessive) per voice bible
 */

import { sendEmail } from "./resend";
import { createAdminClient } from "../supabase/admin";

export interface StudioBranding {
  studioName: string;
  studioLogo?: string;
  primaryColor?: string;
  supportEmail?: string;
  showSaltAttribution?: boolean;
}

/**
 * Get studio branding settings for email customization
 */
export async function getStudioBranding(studioId: string): Promise<StudioBranding> {
  const supabase = createAdminClient();
  
  const { data: studio, error } = await supabase
    .from("studios")
    .select("name, settings")
    .eq("id", studioId)
    .single();
  
  if (error || !studio) {
    console.error("Failed to load studio branding:", error);
    // Fallback to generic branding
    return {
      studioName: "Your Studio",
      showSaltAttribution: false,
    };
  }
  
  const settings = studio.settings as any || {};
  
  return {
    studioName: studio.name,
    studioLogo: settings.logo_url,
    primaryColor: settings.brand_color || "#3b82f6",
    supportEmail: settings.support_email,
    showSaltAttribution: settings.show_salt_attribution || false,
  };
}

/**
 * Base HTML template wrapper with studio branding
 */
function createEmailTemplate(branding: StudioBranding, content: string): string {
  const attribution = branding.showSaltAttribution
    ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">Powered by <a href="https://saltcore.io" style="color: #3b82f6; text-decoration: none;">Salt Core</a></p>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email from ${branding.studioName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      ${
        branding.studioLogo
          ? `<img src="${branding.studioLogo}" alt="${branding.studioName}" style="max-width: 150px; height: auto;" />`
          : `<h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">${branding.studioName}</h1>`
      }
    </div>
    
    <!-- Content Card -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
      ${content}
    </div>
    
    ${attribution}
  </div>
</body>
</html>
  `;
}

/**
 * CTA Button component for emails
 */
function createButton(text: string, url: string, color: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" 
         style="display: inline-block; padding: 12px 32px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Send invite email to a new client user
 */
export async function sendClientInviteEmail({
  studioId,
  clientName,
  clientUserEmail,
  inviteLink,
}: {
  studioId: string;
  clientName: string;
  clientUserEmail: string;
  inviteLink: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      You've been invited to the bridge for ${clientName}
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      ${branding.studioName} has invited you to access the bridge—a private portal where you can view project updates, deliverables, and communicate directly with your team.
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Click the button below to accept the invitation and get started:
    </p>
    
    ${createButton("Access the Bridge", inviteLink, branding.primaryColor || "#3b82f6")}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      This link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `You've been invited to the bridge for ${clientName}\n\n${branding.studioName} has invited you to access the bridge. Click this link to accept: ${inviteLink}\n\nThis link will expire in 7 days.`;
  
  await sendEmail({
    to: clientUserEmail,
    subject: `You've been invited to the bridge for ${clientName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Send access restored email (for returning users)
 */
export async function sendAccessRestoredEmail({
  studioId,
  clientName,
  clientUserEmail,
  magicLink,
}: {
  studioId: string;
  clientName: string;
  clientUserEmail: string;
  magicLink: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Sign in to the bridge for ${clientName}
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Click the button below to securely sign in to the bridge:
    </p>
    
    ${createButton("Sign In", magicLink, branding.primaryColor || "#3b82f6")}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `Sign in to the bridge for ${clientName}\n\nClick this link to sign in: ${magicLink}\n\nThis link will expire in 1 hour.`;
  
  await sendEmail({
    to: clientUserEmail,
    subject: `Sign in to the bridge for ${clientName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Send invite resent confirmation
 */
export async function sendInviteResentEmail({
  studioId,
  clientName,
  clientUserEmail,
  inviteLink,
}: {
  studioId: string;
  clientName: string;
  clientUserEmail: string;
  inviteLink: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Invitation reminder: Access the bridge for ${clientName}
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      ${branding.studioName} has resent your invitation to access the bridge for ${clientName}.
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Click the button below to accept the invitation:
    </p>
    
    ${createButton("Access the Bridge", inviteLink, branding.primaryColor || "#3b82f6")}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      This link will expire in 7 days.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `Invitation reminder: Access the bridge for ${clientName}\n\n${branding.studioName} has resent your invitation. Click this link to accept: ${inviteLink}\n\nThis link will expire in 7 days.`;
  
  await sendEmail({
    to: clientUserEmail,
    subject: `Reminder: Access the bridge for ${clientName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Send access revoked notification
 */
export async function sendAccessRevokedEmail({
  studioId,
  clientName,
  clientUserEmail,
}: {
  studioId: string;
  clientName: string;
  clientUserEmail: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Access to the bridge for ${clientName} has been removed
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Your access to the bridge for ${clientName} has been removed by ${branding.studioName}.
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      If you believe this was done in error, please contact ${branding.supportEmail || "the studio"}.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `Access to the bridge for ${clientName} has been removed\n\nYour access has been removed by ${branding.studioName}. If you believe this was done in error, please contact ${branding.supportEmail || "the studio"}.`;
  
  await sendEmail({
    to: clientUserEmail,
    subject: `Access removed: the bridge for ${clientName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

// ===========================================
// Billing-Related Bridge Emails
// ===========================================

/**
 * Send invoice payment link to client
 */
export async function sendInvoicePaymentLinkEmail({
  studioId,
  clientEmail,
  clientName,
  invoiceAmount,
  invoiceCurrency,
  invoiceDescription,
  dueDate,
  paymentLinkUrl,
}: {
  studioId: string;
  clientEmail: string;
  clientName: string;
  invoiceAmount: number;
  invoiceCurrency: string;
  invoiceDescription?: string;
  dueDate?: string;
  paymentLinkUrl: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoiceCurrency.toUpperCase(),
  }).format(invoiceAmount / 100);
  
  const dueDateText = dueDate
    ? `Due by ${new Date(dueDate).toLocaleDateString()}`
    : "";
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      New Invoice from ${branding.studioName}
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hi ${clientName},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      You have a new invoice ready for payment.
    </p>
    
    <div style="background-color: #f3f4f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
      ${invoiceDescription ? `
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">
          ${invoiceDescription}
        </p>
      ` : ""}
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">
        ${formattedAmount}
      </p>
      ${dueDateText ? `
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
          ${dueDateText}
        </p>
      ` : ""}
    </div>
    
    ${createButton("View & Pay Invoice", paymentLinkUrl, branding.primaryColor || "#3b82f6")}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      This payment link will expire in 30 days. If you need a new link, please contact ${branding.studioName}.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `New Invoice from ${branding.studioName}\n\nHi ${clientName},\n\nYou have a new invoice ready for payment.\n\nAmount: ${formattedAmount}\n${dueDateText}\n\nView and pay: ${paymentLinkUrl}\n\nThis payment link will expire in 30 days.`;
  
  await sendEmail({
    to: clientEmail,
    subject: `Invoice from ${branding.studioName} - ${formattedAmount}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Send notification to studio owner when invoice is paid
 */
export async function sendInvoicePaidToStudioEmail({
  studioId,
  studioOwnerEmail,
  clientName,
  invoiceAmount,
  invoiceCurrency,
}: {
  studioId: string;
  studioOwnerEmail: string;
  clientName: string;
  invoiceAmount: number;
  invoiceCurrency: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoiceCurrency.toUpperCase(),
  }).format(invoiceAmount / 100);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Payment Received: ${formattedAmount}
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Great news! ${clientName} has paid their invoice.
    </p>
    
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">
        ${formattedAmount} received
      </p>
    </div>
    
    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
      Funds will be deposited to your connected bank account according to your payout schedule.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `Payment Received: ${formattedAmount}\n\nGreat news! ${clientName} has paid their invoice of ${formattedAmount}. Funds will be deposited to your connected bank account according to your payout schedule.`;
  
  await sendEmail({
    to: studioOwnerEmail,
    subject: `Payment Received: ${formattedAmount} from ${clientName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Send notification to studio owner when invoice payment fails
 */
export async function sendInvoicePaymentFailedToStudioEmail({
  studioId,
  studioOwnerEmail,
  clientName,
  clientEmail,
  invoiceAmount,
  invoiceCurrency,
}: {
  studioId: string;
  studioOwnerEmail: string;
  clientName: string;
  clientEmail: string;
  invoiceAmount: number;
  invoiceCurrency: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoiceCurrency.toUpperCase(),
  }).format(invoiceAmount / 100);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Payment Failed: ${formattedAmount}
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      The payment attempt from ${clientName} has failed.
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; font-weight: 600;">
        Invoice: ${formattedAmount}
      </p>
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        Client: ${clientName} (${clientEmail})
      </p>
    </div>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      The client has been notified and can retry the payment. You may want to follow up with them directly.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text = `Payment Failed: ${formattedAmount}\n\nThe payment attempt from ${clientName} (${clientEmail}) for ${formattedAmount} has failed. The client has been notified and can retry the payment.`;
  
  await sendEmail({
    to: studioOwnerEmail,
    subject: `Payment Failed: ${clientName} - ${formattedAmount}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

/**
 * Send notification when retainer subscription starts or is canceled
 */
export async function sendRetainerStatusEmail({
  studioId,
  clientEmail,
  clientName,
  retainerAmount,
  retainerCurrency,
  retainerInterval,
  status,
  dashboardUrl,
}: {
  studioId: string;
  clientEmail: string;
  clientName: string;
  retainerAmount: number;
  retainerCurrency: string;
  retainerInterval: string;
  status: "started" | "canceled";
  dashboardUrl?: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: retainerCurrency.toUpperCase(),
  }).format(retainerAmount / 100);
  
  const intervalDisplay = retainerInterval === "month" ? "monthly" : retainerInterval;
  
  const content =
    status === "started"
      ? `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Your Retainer with ${branding.studioName} is Active
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hi ${clientName},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Your ${intervalDisplay} retainer is now active and will automatically renew.
    </p>
    
    <div style="background-color: #f3f4f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        Billing Amount
      </p>
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">
        ${formattedAmount}/${intervalDisplay}
      </p>
    </div>
    
    ${dashboardUrl ? createButton("View Project Dashboard", dashboardUrl, branding.primaryColor || "#3b82f6") : ""}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      You'll receive a receipt after each automatic payment. You can cancel this retainer at any time.
    </p>
  `
      : `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Your Retainer Has Been Canceled
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hi ${clientName},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Your ${intervalDisplay} retainer of ${formattedAmount} with ${branding.studioName} has been canceled.
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      No further charges will be made. If you have any questions, please contact ${branding.studioName} directly.
    </p>
  `;
  
  const html = createEmailTemplate(branding, content);
  const text =
    status === "started"
      ? `Your Retainer with ${branding.studioName} is Active\n\nHi ${clientName},\n\nYour ${intervalDisplay} retainer of ${formattedAmount} is now active and will automatically renew. You'll receive a receipt after each automatic payment.`
      : `Your Retainer Has Been Canceled\n\nHi ${clientName},\n\nYour ${intervalDisplay} retainer of ${formattedAmount} with ${branding.studioName} has been canceled. No further charges will be made.`;
  
  await sendEmail({
    to: clientEmail,
    subject:
      status === "started"
        ? `Retainer Active: ${formattedAmount}/${intervalDisplay}`
        : `Retainer Canceled`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

// ===========================================
// Messaging-Related Bridge Emails
// ===========================================

/**
 * Salt Core default branding for studio users
 */
const saltCoreBranding: StudioBranding = {
  studioName: "Salt Core",
  studioLogo: `${process.env.NEXT_PUBLIC_SITE_URL}/salt-core-logo-black.svg`,
  primaryColor: "#0ea5e9", // cyan-500
  showSaltAttribution: false,
};

/**
 * Send notification email when a new message is received.
 * - For client users: Uses studio branding (message is from studio)
 * - For studio users: Uses Salt Core branding (message is from client)
 */
export async function sendNewMessageEmail({
  recipientEmail,
  recipientName,
  recipientType,
  senderName,
  messagePreview,
  conversationUrl,
  studioId,
  clientName,
}: {
  recipientEmail: string;
  recipientName: string;
  recipientType: "studio_user" | "client_user";
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
  studioId: string;
  clientName?: string;
}): Promise<void> {
  // Use studio branding for client users, Salt Core branding for studio users
  const branding = recipientType === "client_user"
    ? await getStudioBranding(studioId)
    : saltCoreBranding;

  // Truncate message preview to ~150 chars
  const truncatedPreview = messagePreview.length > 150
    ? messagePreview.slice(0, 147) + "..."
    : messagePreview;

  // Determine the context message based on recipient type
  const contextMessage = recipientType === "client_user"
    ? `You have a new message from ${branding.studioName}.`
    : `You have a new message from ${clientName || "a client"}.`;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      New Message from ${senderName}
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      ${contextMessage}
    </p>

    <div style="background-color: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${branding.primaryColor || "#3b82f6"};">
      <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">
        "${truncatedPreview}"
      </p>
    </div>

    ${createButton("View Message", conversationUrl, branding.primaryColor || "#3b82f6")}

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      You're receiving this because you have unread messages. Visit the bridge to respond.
    </p>
  `;

  const html = createEmailTemplate(branding, content);
  const text = `New Message from ${senderName}\n\n${contextMessage}\n\n"${truncatedPreview}"\n\nView and respond: ${conversationUrl}`;

  await sendEmail({
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
  });
}

