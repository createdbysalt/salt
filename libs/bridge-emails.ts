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
import { createAdminClient } from "./supabase/admin";

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

