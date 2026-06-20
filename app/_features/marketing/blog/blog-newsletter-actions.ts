"use server";

import { cookies, headers } from "next/headers";
import {
  CONSENT_COOKIE_NAME,
  hasAnalyticsConsent,
  parseConsentCookie,
} from "@/app/_lib/consent/cookie-consent";
import { upsertBlogNewsletterResendContact } from "@/app/_lib/email/resend-blog-newsletter-audience";
import {
  checkRateLimit,
  createRateLimitKey,
  getClientIpFromHeaders,
  RateLimitPresets,
} from "@/app/_lib/rate-limit/rate-limit";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ActionResponse } from "@/app/_features/marketing/actions";
import { isValidWaitlistEmail } from "@/app/_features/marketing/waitlist-qualification";
import { EMAIL_MAX_LENGTH } from "@/app/_features/marketing/waitlist-lead";
import { buildBlogNewsletterSubscriberRow } from "./blog-newsletter-lead";

export type SubscribeBlogNewsletterInput = {
  email: string;
  countryCode: string;
  marketingConsent: boolean;
  articleSlug?: string;
  source?: string;
};

async function recordBlogNewsletterFunnelEvent(
  path: string,
  metadata: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("marketing_funnel_events").insert({
    event: "blog_newsletter_success",
    path,
    metadata,
  });

  if (error) {
    console.error("marketing_funnel_events insert failed (blog_newsletter):", error);
  }
}

export async function subscribeBlogNewsletterAction(
  data: SubscribeBlogNewsletterInput
): Promise<ActionResponse<void>> {
  try {
    const email = data.email?.trim();

    if (!email || !isValidWaitlistEmail(email)) {
      return { success: false, error: "Enter a valid email address." };
    }

    if (email.length > EMAIL_MAX_LENGTH) {
      return { success: false, error: "Enter a valid email address." };
    }

    if (!data.marketingConsent) {
      return {
        success: false,
        error: "Please agree to receive marketing communications.",
      };
    }

    const row = buildBlogNewsletterSubscriberRow({
      email,
      countryCode: data.countryCode,
      marketingConsent: true,
      articleSlug: data.articleSlug,
      source: data.source,
    });

    const headerList = await headers();
    const clientIp = getClientIpFromHeaders(headerList);

    const emailLimit = checkRateLimit(
      createRateLimitKey("blog-newsletter:email", row.normalized_email),
      RateLimitPresets.MODERATE
    );
    const ipLimit = checkRateLimit(
      createRateLimitKey("blog-newsletter:ip", clientIp),
      RateLimitPresets.MODERATE
    );

    if (!emailLimit.allowed || !ipLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again." };
    }

    const supabase = createAdminClient();

    const { data: existing, error: selectError } = await supabase
      .from("blog_newsletter_subscribers")
      .select("id")
      .eq("normalized_email", row.normalized_email)
      .maybeSingle();

    if (selectError) {
      console.error("Error loading blog newsletter subscriber:", selectError);
      return {
        success: false,
        error: "We could not save your subscription. Please try again.",
      };
    }

    const isResubscribe = Boolean(existing);

    const { error: upsertError } = await supabase
      .from("blog_newsletter_subscribers")
      .upsert(row, { onConflict: "normalized_email" });

    if (upsertError) {
      console.error("Error saving blog newsletter subscriber:", upsertError);
      return {
        success: false,
        error: "We could not save your subscription. Please try again.",
      };
    }

    const path =
      headerList.get("referer")?.trim() ||
      headerList.get("x-pathname")?.trim() ||
      (row.article_slug ? `/blog/${row.article_slug}` : "/blog");

    const cookieStore = await cookies();
    const consentValue = cookieStore.get(CONSENT_COOKIE_NAME)?.value;
    const analyticsAllowed = hasAnalyticsConsent(
      parseConsentCookie(
        consentValue ? decodeURIComponent(consentValue) : undefined
      )
    );

    if (analyticsAllowed && !isResubscribe) {
      void recordBlogNewsletterFunnelEvent(path, {
        source: row.source,
        country_code: row.country_code,
        article_slug: row.article_slug,
      });
    }

    const audienceResult = await Promise.allSettled([
      upsertBlogNewsletterResendContact({ email: row.email }),
    ]).then((results) => results[0]);

    if (audienceResult.status === "rejected") {
      console.error(
        "Blog newsletter Resend audience sync failed:",
        audienceResult.reason
      );
    } else if (
      audienceResult.status === "fulfilled" &&
      !audienceResult.value.synced &&
      audienceResult.value.skippedReason
    ) {
      console.warn(
        "Blog newsletter Resend audience sync skipped:",
        audienceResult.value.skippedReason
      );
    }

    return {
      success: true,
      data: undefined,
      alreadyJoined: isResubscribe,
    };
  } catch (error) {
    console.error("Error in subscribeBlogNewsletterAction:", error);
    return {
      success: false,
      error: "We could not save your subscription. Please try again.",
    };
  }
}
