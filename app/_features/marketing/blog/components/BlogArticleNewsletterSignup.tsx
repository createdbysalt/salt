"use client";

import { startTransition, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import { Button, Input, Label } from "@repo/ui";
import { subscribeBlogNewsletterAction } from "@/app/_features/marketing/blog/blog-newsletter-actions";
import { BLOG_NEWSLETTER_COUNTRIES } from "@/app/_features/marketing/blog/blog-newsletter-countries";
import type { ResolvedBlogNewsletterForm } from "@/app/_features/marketing/blog/blog-newsletter-form-config";
import { getWaitlistEmailValidationMessage } from "@/app/_features/marketing/waitlist-qualification";

type BlogArticleNewsletterSignupProps = {
  articleSlug: string;
  form: ResolvedBlogNewsletterForm;
};

export function BlogArticleNewsletterSignup({
  articleSlug,
  form,
}: BlogArticleNewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = getWaitlistEmailValidationMessage(email);
    if (validationMessage) {
      setMessage(validationMessage);
      setSuccessMessage(null);
      return;
    }

    if (!marketingConsent) {
      setMessage("Please agree to receive marketing communications.");
      setSuccessMessage(null);
      return;
    }

    setMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    startTransition(async () => {
      const result = await subscribeBlogNewsletterAction({
        email: email.trim(),
        countryCode,
        marketingConsent: true,
        articleSlug,
        source: form.source,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setMessage(result.error);
        return;
      }

      setSuccessMessage(
        result.alreadyJoined
          ? "You're already subscribed. Thanks for reading."
          : "You're subscribed. Check your inbox for updates from Salt."
      );
      setEmail("");
      setMarketingConsent(false);
    });
  }

  return (
    <section
      className="blog-article-newsletter"
      aria-labelledby="blog-newsletter-heading"
    >
      <h2
        id="blog-newsletter-heading"
        className="blog-article-newsletter__heading"
      >
        {form.heading}
      </h2>
      {form.subheading ? (
        <p className="blog-article-newsletter__subheading">{form.subheading}</p>
      ) : null}

      <form className="blog-article-newsletter__form" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="blog-newsletter-email" className="text-sm font-semibold">
            Business email
          </Label>
          <Input
            id="blog-newsletter-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={form.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-newsletter-country" className="text-sm font-semibold">
            Country
          </Label>
          <select
            id="blog-newsletter-country"
            name="country"
            className="blog-article-newsletter__select"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            disabled={isSubmitting}
            required
          >
            {BLOG_NEWSLETTER_COUNTRIES.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        </div>

        <label className="blog-article-newsletter__consent">
          <input
            type="checkbox"
            name="marketingConsent"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
            disabled={isSubmitting}
            className="blog-article-newsletter__checkbox"
          />
          <span>{form.consentText}</span>
        </label>

        <Button
          type="submit"
          className={cn(
            "blog-article-newsletter__submit h-11 w-full rounded-lg bg-foreground text-sm font-semibold text-background shadow-sm hover:bg-foreground/90"
          )}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Subscribing…
            </>
          ) : (
            form.submitLabel
          )}
        </Button>

        {message ? (
          <p className="blog-article-newsletter__message blog-article-newsletter__message--error" role="alert">
            {message}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className="blog-article-newsletter__message blog-article-newsletter__message--success"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}
