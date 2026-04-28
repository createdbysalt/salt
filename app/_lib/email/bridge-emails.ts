/**
 * Bridge Email System
 * 
 * White-labelable emails for client users that feel owned by the studio,
 * NOT by SALT. These are sent via Resend with studio branding.
 * 
 * Key principles:
 * - Studio name/logo/colors as sender identity
 * - Reply-to goes to studio's support email
 * - SALT attribution is optional (default OFF)
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
 *
 * Uses the newer bridge_branding JSONB field which includes:
 * - logo.darkUrl / logo.lightUrl (for different backgrounds)
 * - colors.accent (primary brand color)
 * - footer.showPoweredBy (SALT attribution)
 *
 * Falls back to legacy settings fields if bridge_branding is empty.
 */
export async function getStudioBranding(studioId: string): Promise<StudioBranding> {
  // Handle empty studioId (fallback for unknown users)
  if (!studioId) {
    return {
      studioName: "Your Studio",
      primaryColor: "#2a77e8",
      showSaltAttribution: false,
    };
  }

  const supabase = createAdminClient();

  const { data: studio, error } = await supabase
    .from("studios")
    .select("name, settings, bridge_branding")
    .eq("id", studioId)
    .single();

  if (error || !studio) {
    console.error("Failed to load studio branding:", error);
    return {
      studioName: "Your Studio",
      primaryColor: "#2a77e8",
      showSaltAttribution: false,
    };
  }

  const bridgeBranding = studio.bridge_branding as {
    logo?: { darkUrl?: string; lightUrl?: string };
    colors?: { accent?: string };
    footer?: { showPoweredBy?: boolean };
  } | null;

  const legacySettings = studio.settings as {
    logo_url?: string;
    brand_color?: string;
    support_email?: string;
    show_salt_attribution?: boolean;
  } | null;

  // Prefer bridge_branding fields, fall back to legacy settings
  // Use darkUrl for emails (light background)
  const logo = bridgeBranding?.logo?.darkUrl
    || bridgeBranding?.logo?.lightUrl
    || legacySettings?.logo_url;

  const primaryColor = bridgeBranding?.colors?.accent
    || legacySettings?.brand_color
    || "#2a77e8";

  // Default showPoweredBy to false for emails (less intrusive)
  const showAttribution = bridgeBranding?.footer?.showPoweredBy
    ?? legacySettings?.show_salt_attribution
    ?? false;

  return {
    studioName: studio.name,
    studioLogo: logo,
    primaryColor,
    supportEmail: legacySettings?.support_email,
    showSaltAttribution: showAttribution,
  };
}

/**
 * Generate the first letter/initial for the studio logo fallback
 */
function getStudioInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/**
 * Base HTML template wrapper with studio branding
 *
 * Modern, clean design with:
 * - Gradient accent on logo fallback
 * - Rounded card with subtle shadow
 * - Support email in footer
 */
export function createEmailTemplate(branding: StudioBranding, content: string): string {
  const initial = getStudioInitial(branding.studioName);
  const primaryColor = branding.primaryColor || "#2a77e8";

  // Generate a slightly lighter shade for gradient
  const gradientEnd = adjustColorBrightness(primaryColor, 20);

  const logoHtml = branding.studioLogo
    ? `<img src="${branding.studioLogo}" alt="${branding.studioName}" style="max-height: 48px; width: auto;" />`
    : `
      <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, ${primaryColor} 0%, ${gradientEnd} 100%); border-radius: 14px; line-height: 56px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 24px; font-weight: 700;">${initial}</span>
      </div>
      <div style="font-size: 18px; font-weight: 600; color: #111827;">${branding.studioName}</div>
    `;

  const footerContact = branding.supportEmail
    ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">
        Questions? Contact <a href="mailto:${branding.supportEmail}" style="color: #6b7280; text-decoration: underline;">${branding.supportEmail}</a>
      </p>`
    : "";

  const attribution = branding.showSaltAttribution
    ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #d1d5db;">
        Powered by <a href="https://usesalt.io" style="color: #9ca3af; text-decoration: none;">SALT</a>
      </p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email from ${branding.studioName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">

  <!-- Wrapper -->
  <div style="width: 100%; background-color: #f3f4f6; padding: 48px 16px;">

    <!-- Email Container -->
    <div style="max-width: 480px; margin: 0 auto;">

      <!-- Logo/Brand Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        ${logoHtml}
      </div>

      <!-- Main Card -->
      <div style="background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03);">
        ${content}
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 32px;">
        ${footerContact}
        <p style="margin: 0; font-size: 12px; color: #d1d5db;">
          Sent by ${branding.studioName}
        </p>
        ${attribution}
      </div>

    </div>
  </div>

</body>
</html>
  `;
}

/**
 * Adjust hex color brightness
 * Positive amount = lighter, negative = darker
 */
function adjustColorBrightness(hex: string, amount: number): string {
  const color = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(color.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(color.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(color.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * CTA Button component for emails
 * Features gradient background and subtle shadow
 */
function createButton(text: string, url: string, color: string): string {
  const gradientEnd = adjustColorBrightness(color, 15);
  const shadowColor = color + "59"; // 35% opacity

  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}"
         style="display: inline-block; padding: 14px 48px; background: linear-gradient(135deg, ${color} 0%, ${gradientEnd} 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 ${shadowColor};">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Simpler email template for client correspondence
 *
 * Used for direct email communication (vs system notifications).
 * Features a subtle branded header with studio name/logo, the message content,
 * and a minimal footer. Feels like regular email, not a system notification.
 */
export function createCorrespondenceTemplate(
  branding: StudioBranding,
  content: string,
  senderName: string
): string {
  const primaryColor = branding.primaryColor || "#2a77e8";
  const initial = branding.studioName.charAt(0).toUpperCase();

  // Small inline logo or initial
  const logoHtml = branding.studioLogo
    ? `<img src="${branding.studioLogo}" alt="${branding.studioName}" style="height: 24px; width: auto; vertical-align: middle;" />`
    : `<span style="display: inline-block; width: 24px; height: 24px; background-color: ${primaryColor}; border-radius: 6px; line-height: 24px; text-align: center; color: #fff; font-size: 12px; font-weight: 600; vertical-align: middle;">${initial}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">

    <!-- Subtle branded header -->
    <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
      ${logoHtml}
      <span style="margin-left: 8px; font-size: 14px; color: #6b7280; vertical-align: middle;">${branding.studioName}</span>
    </div>

    <!-- Email content -->
    <div style="font-size: 16px; line-height: 1.6; color: #1a1a1a; white-space: pre-wrap;">
${content}
    </div>

    <!-- Sender signature -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #374151; font-weight: 500;">${senderName}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">${branding.studioName}</p>
    </div>

  </div>
</body>
</html>`;
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
    
    ${createButton("Access the Bridge", inviteLink, branding.primaryColor || "#2a77e8")}
    
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
    fromName: branding.studioName,
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
    
    ${createButton("Sign In", magicLink, branding.primaryColor || "#2a77e8")}
    
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
    fromName: branding.studioName,
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
    
    ${createButton("Access the Bridge", inviteLink, branding.primaryColor || "#2a77e8")}
    
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
    fromName: branding.studioName,
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
    fromName: branding.studioName,
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
    
    ${createButton("View & Pay Invoice", paymentLinkUrl, branding.primaryColor || "#2a77e8")}
    
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
    fromName: branding.studioName,
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
    
    ${dashboardUrl ? createButton("View Project Dashboard", dashboardUrl, branding.primaryColor || "#2a77e8") : ""}
    
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
    fromName: branding.studioName,
  });
}

// ===========================================
// Auth-Related Bridge Emails
// ===========================================

/**
 * Send magic link sign-in email for Bridge
 * This replaces Supabase's default magic link email with studio branding.
 */
export async function sendBridgeMagicLinkEmail({
  studioId,
  userEmail,
  magicLink,
  studioName,
  clientName,
}: {
  studioId: string;
  userEmail: string;
  magicLink: string;
  studioName?: string;
  clientName?: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);
  const displayName = studioName || branding.studioName;

  console.log("[sendBridgeMagicLinkEmail] studioId:", studioId, "displayName:", displayName, "branding:", JSON.stringify(branding));

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827; text-align: center; letter-spacing: -0.025em;">
      Sign in to the bridge
    </h1>
    ${clientName ? `<p style="margin: 0 0 24px 0; font-size: 14px; color: #9ca3af; text-align: center;">${clientName}</p>` : ""}

    <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #6b7280; text-align: center;">
      Click the button below to securely access your client portal. This link expires in 1 hour.
    </p>

    ${createButton("Sign In", magicLink, branding.primaryColor || "#2a77e8")}

    <!-- Divider -->
    <div style="height: 1px; background-color: #e5e7eb; margin: 24px 0;"></div>

    <p style="margin: 0 0 12px 0; font-size: 13px; color: #9ca3af; text-align: center;">
      Or copy this link into your browser:
    </p>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; word-break: break-all; text-align: center; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
        ${magicLink}
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
      If you didn't request this email, you can safely ignore it.
    </p>
  `;

  const html = createEmailTemplate(branding, content);
  const text = `Sign in to ${displayName}\n\nClick this link to sign in: ${magicLink}\n\nThis link expires in 1 hour and can only be used once.`;

  await sendEmail({
    to: userEmail,
    subject: `Sign in to ${displayName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
    fromName: displayName,
  });
}

/**
 * Send email change confirmation for Bridge users
 * This replaces Supabase's default email change confirmation.
 */
export async function sendBridgeEmailChangeEmail({
  studioId,
  currentEmail,
  newEmail,
  confirmationLink,
}: {
  studioId: string;
  currentEmail: string;
  newEmail: string;
  confirmationLink: string;
}): Promise<void> {
  const branding = await getStudioBranding(studioId);

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Confirm your new email address
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      You requested to change your email from <strong>${currentEmail}</strong> to <strong>${newEmail}</strong>.
    </p>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Click the button below to confirm this change:
    </p>

    ${createButton("Confirm Email Change", confirmationLink, branding.primaryColor || "#2a77e8")}

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
      This link expires in 24 hours. If you didn't request this change, please ignore this email and your email will remain unchanged.
    </p>
  `;

  const html = createEmailTemplate(branding, content);
  const text = `Confirm your new email address\n\nYou requested to change your email from ${currentEmail} to ${newEmail}.\n\nClick this link to confirm: ${confirmationLink}\n\nThis link expires in 24 hours.`;

  // Send to the NEW email address (that's what they need to verify)
  await sendEmail({
    to: newEmail,
    subject: `Confirm your new email for ${branding.studioName}`,
    html,
    text,
    replyTo: branding.supportEmail || undefined,
    fromName: branding.studioName,
  });
}

// ===========================================
// Messaging-Related Bridge Emails
// ===========================================

/**
 * SALT default branding for studio users
 */
const saltCoreBranding: StudioBranding = {
  studioName: "SALT",
  studioLogo: `${process.env.NEXT_PUBLIC_SITE_URL}/salt-core-logo-black.svg`,
  primaryColor: "#0ea5e9", // cyan-500
  showSaltAttribution: false,
};

/**
 * Send notification email when a new message is received.
 * - For client users: Uses studio branding (message is from studio)
 * - For studio users: Uses SALT branding (message is from client)
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
  // Use studio branding for client users, SALT branding for studio users
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

    <div style="background-color: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${branding.primaryColor || "#2a77e8"};">
      <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">
        "${truncatedPreview}"
      </p>
    </div>

    ${createButton("View Message", conversationUrl, branding.primaryColor || "#2a77e8")}

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
    fromName: branding.studioName,
  });
}

