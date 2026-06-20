import type { FormDefinition } from "@/app/_lib/sanity/types";

export const BLOG_NEWSLETTER_FORM_KEY = "blog-newsletter";

export const BLOG_NEWSLETTER_FORM_FALLBACK: FormDefinition = {
  _type: "formDefinition",
  _id: "form-blog-newsletter-fallback",
  key: BLOG_NEWSLETTER_FORM_KEY,
  title: "Blog newsletter",
  route: "/blog",
  formKind: "blog-newsletter",
  waitlistSource: "blog-sidebar",
  analyticsEvent: "blog_newsletter_success",
  heading: "Unlock exclusive Salt content",
  subheading:
    "Subscribe for best practices, research, and product updates for solo service entrepreneurs.",
  submitLabel: "Subscribe",
  emailPlaceholder: "Enter your email",
  gateDisclaimer:
    "I'd like to receive marketing communications regarding Salt's products, services, and events. I understand I can unsubscribe at any time.",
};

export type ResolvedBlogNewsletterForm = {
  heading: string;
  subheading?: string;
  submitLabel: string;
  emailPlaceholder: string;
  consentText: string;
  source: string;
};

export function resolveBlogNewsletterForm(
  doc?: FormDefinition | null
): ResolvedBlogNewsletterForm {
  const fallback = BLOG_NEWSLETTER_FORM_FALLBACK;

  return {
    heading: doc?.heading ?? fallback.heading ?? "Unlock exclusive Salt content",
    subheading: doc?.subheading ?? fallback.subheading,
    submitLabel: doc?.submitLabel ?? fallback.submitLabel ?? "Subscribe",
    emailPlaceholder:
      doc?.emailPlaceholder ?? fallback.emailPlaceholder ?? "Enter your email",
    consentText:
      doc?.gateDisclaimer ??
      fallback.gateDisclaimer ??
      "I'd like to receive marketing communications regarding Salt's products, services, and events. I understand I can unsubscribe at any time.",
    source: doc?.waitlistSource ?? fallback.waitlistSource ?? "blog-sidebar",
  };
}

export async function fetchResolvedBlogNewsletterForm(
  preview = false
): Promise<ResolvedBlogNewsletterForm> {
  const { getFormDefinition } = await import("@/app/_lib/sanity/queries");
  const doc = await getFormDefinition(BLOG_NEWSLETTER_FORM_KEY, preview);
  return resolveBlogNewsletterForm(doc);
}
