/**
 * Resend Audience sync for blog newsletter subscribers.
 * Prefer RESEND_BLOG_NEWSLETTER_AUDIENCE_ID; falls back to waitlist audience.
 */

import { getResendClient } from "@/app/_lib/email/resend";
import { getWaitlistAudienceId } from "@/app/_lib/email/resend-waitlist-audience";

export function getBlogNewsletterAudienceId(): string | undefined {
  const blogAudience = process.env.RESEND_BLOG_NEWSLETTER_AUDIENCE_ID?.trim();
  if (blogAudience) return blogAudience;
  return getWaitlistAudienceId();
}

export async function upsertBlogNewsletterResendContact(input: {
  email: string;
  unsubscribed?: boolean;
}): Promise<{ synced: boolean; contactId?: string; skippedReason?: string }> {
  const audienceId = getBlogNewsletterAudienceId();
  if (!audienceId) {
    return {
      synced: false,
      skippedReason:
        "RESEND_BLOG_NEWSLETTER_AUDIENCE_ID or RESEND_WAITLIST_AUDIENCE_ID is not configured",
    };
  }

  const resend = getResendClient();
  const { data, error } = await resend.contacts.create({
    audienceId,
    email: input.email.trim(),
    unsubscribed: input.unsubscribed ?? false,
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("already") || message.includes("exist")) {
      return { synced: true };
    }
    throw new Error(`Resend blog newsletter contact create failed: ${error.message}`);
  }

  return { synced: true, contactId: data?.id };
}
