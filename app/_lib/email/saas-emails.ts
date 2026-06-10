/**
 * Salt SaaS Billing Email System
 * 
 * Emails sent to studio owners about their Salt subscription.
 * Direct, professional tone focusing on Salt branding.
 */

import { sendEmail } from "./resend";

/**
 * Salt logo URL for emails
 */
const SALT_LOGO_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/salt-logo-black.svg`;

/**
 * Create email template wrapper with Salt branding
 */
function createSaltEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Salt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${SALT_LOGO_URL}" alt="Salt" style="max-width: 150px; height: auto;" />
      <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">Build better, ship faster</p>
    </div>
    
    <!-- Content Card -->
    <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="margin-top: 32px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Simcoe House Inc. All rights reserved.</p>
      <p style="margin: 8px 0 0 0;">
        <a href="https://usesalt.io" style="color: #3b82f6; text-decoration: none;">usesalt.io</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Create CTA button component
 */
function createButton(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" 
         style="display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Send email when SaaS subscription payment fails (past_due status)
 * Triggers grace period (7 days to update payment method)
 */
export async function sendSaasPaymentFailedEmail({
  userEmail,
  userName,
  tier,
}: {
  userEmail: string;
  userName?: string;
  tier: string;
}): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  const tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Payment Failed for Your ${tierDisplay} Plan
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      ${greeting}
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      We were unable to process your recent payment for your Salt ${tierDisplay} subscription.
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Your account will remain active for 7 days</strong> while we attempt to process the payment. 
        Please update your payment method to avoid service interruption.
      </p>
    </div>
    
    ${createButton("Update Payment Method", `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`)}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
      If you have questions or need assistance, please reply to this email or contact our support team.
    </p>
  `;
  
  const html = createSaltEmailTemplate(content);
  const text = `Payment Failed for Your ${tierDisplay} Plan\n\n${greeting}\n\nWe were unable to process your recent payment for your Salt ${tierDisplay} subscription. Your account will remain active for 7 days while we attempt to process the payment. Please update your payment method to avoid service interruption.\n\nUpdate your payment method: ${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`;
  
  await sendEmail({
    to: userEmail,
    subject: `Action Required: Update Payment Method for Salt`,
    html,
    text,
  });
}

/**
 * Send email when SaaS subscription is canceled
 */
export async function sendSaasCanceledEmail({
  userEmail,
  userName,
  tier,
  endsAt,
}: {
  userEmail: string;
  userName?: string;
  tier: string;
  endsAt: Date;
}): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  const tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1);
  const endDate = endsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Your ${tierDisplay} Subscription Has Been Canceled
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      ${greeting}
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Your Salt ${tierDisplay} subscription has been canceled. You'll continue to have access to your plan features until <strong>${endDate}</strong>.
    </p>
    
    <div style="background-color: #dbeafe; border-left: 4px solid: #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af; font-weight: 600;">
        Changed your mind?
      </p>
      <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
        You can reactivate your subscription at any time before ${endDate}.
      </p>
    </div>
    
    ${createButton("Reactivate Subscription", `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`)}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
      We're sorry to see you go. If you have feedback about how we can improve, we'd love to hear from you.
    </p>
  `;
  
  const html = createSaltEmailTemplate(content);
  const text = `Your ${tierDisplay} Subscription Has Been Canceled\n\n${greeting}\n\nYour Salt ${tierDisplay} subscription has been canceled. You'll continue to have access to your plan features until ${endDate}.\n\nChanged your mind? You can reactivate your subscription at any time: ${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`;
  
  await sendEmail({
    to: userEmail,
    subject: `Subscription Canceled - Access Until ${endDate}`,
    html,
    text,
  });
}

/**
 * Send confirmation email when subscription is successfully created/upgraded
 */
export async function sendSaasSubscriptionConfirmationEmail({
  userEmail,
  userName,
  tier,
  interval,
  amount,
}: {
  userEmail: string;
  userName?: string;
  tier: string;
  interval: string;
  amount: number;
}): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  const tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1);
  const intervalDisplay = interval === "year" ? "yearly" : "monthly";
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
  
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
      Welcome to Salt ${tierDisplay}!
    </h2>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      ${greeting}
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Your ${tierDisplay} subscription is now active. You have full access to all features in your plan.
    </p>
    
    <div style="background-color: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6b7280;">Plan:</span>
        <span style="font-weight: 600; color: #111827;">${tierDisplay}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6b7280;">Billing:</span>
        <span style="font-weight: 600; color: #111827;">${formattedAmount}/${intervalDisplay}</span>
      </div>
    </div>
    
    ${createButton("Go to Dashboard", `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`)}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
      Need help getting started? Check out our <a href="${process.env.NEXT_PUBLIC_SITE_URL}/docs" style="color: #3b82f6; text-decoration: none;">documentation</a> or reach out to support.
    </p>
  `;
  
  const html = createSaltEmailTemplate(content);
  const text = `Welcome to Salt ${tierDisplay}!\n\n${greeting}\n\nYour ${tierDisplay} subscription is now active (${formattedAmount}/${intervalDisplay}). You have full access to all features in your plan.\n\nGo to your dashboard: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;
  
  await sendEmail({
    to: userEmail,
    subject: `Welcome to Salt ${tierDisplay}!`,
    html,
    text,
  });
}




