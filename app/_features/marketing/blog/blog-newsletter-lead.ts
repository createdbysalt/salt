import { normalizeWaitlistEmail } from "@/app/_features/marketing/waitlist-lead";
import {
  sanitizeBlogNewsletterCountry,
  type BlogNewsletterCountryCode,
} from "./blog-newsletter-countries";

export const BLOG_NEWSLETTER_SOURCE_MAX = 64;
export const BLOG_NEWSLETTER_DEFAULT_SOURCE = "blog-sidebar";

export type BlogNewsletterSubscriberRow = {
  email: string;
  normalized_email: string;
  country_code: BlogNewsletterCountryCode;
  marketing_consent: boolean;
  article_slug: string | null;
  source: string;
  metadata: Record<string, unknown>;
};

export function capBlogNewsletterSource(source: string | undefined): string {
  const trimmed = (source ?? "")
    .trim()
    .toLowerCase()
    .slice(0, BLOG_NEWSLETTER_SOURCE_MAX);
  const sanitized = trimmed.replace(/[^a-z0-9_-]/g, "");
  return sanitized.length > 0 ? sanitized : BLOG_NEWSLETTER_DEFAULT_SOURCE;
}

export function sanitizeArticleSlug(slug: string | undefined): string | null {
  const trimmed = slug?.trim().toLowerCase() ?? "";
  if (!trimmed) return null;
  const sanitized = trimmed.replace(/[^a-z0-9-]/g, "");
  return sanitized.length > 0 ? sanitized.slice(0, 120) : null;
}

export function buildBlogNewsletterSubscriberRow(input: {
  email: string;
  countryCode?: string;
  marketingConsent: boolean;
  articleSlug?: string;
  source?: string;
}): BlogNewsletterSubscriberRow {
  const email = input.email.trim();
  const normalized_email = normalizeWaitlistEmail(email);

  return {
    email,
    normalized_email,
    country_code: sanitizeBlogNewsletterCountry(input.countryCode),
    marketing_consent: input.marketingConsent,
    article_slug: sanitizeArticleSlug(input.articleSlug),
    source: capBlogNewsletterSource(input.source),
    metadata: {
      subscribed_at: new Date().toISOString(),
    },
  };
}
