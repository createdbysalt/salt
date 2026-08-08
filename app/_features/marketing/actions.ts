/**
 * Marketing Feature - Server Actions
 *
 * Single write path for waitlist capture.
 */

"use server";

import { cookies, headers } from "next/headers";
import {
  CONSENT_COOKIE_NAME,
  hasAnalyticsConsent,
  parseConsentCookie,
} from "@/app/_lib/consent/cookie-consent";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import {
  checkRateLimit,
  createRateLimitKey,
  getClientIpFromHeaders,
  RateLimitPresets,
} from "@/app/_lib/rate-limit/rate-limit";
import { isValidWaitlistEmail } from "@/app/_features/marketing/waitlist-qualification";
import {
  buildWaitlistRow,
  capSource,
  EMAIL_MAX_LENGTH,
  mergeWaitlistMetadata,
  normalizeWaitlistEmail,
  sanitizeLastStep,
  sanitizeQualification,
  type WaitlistLeadStatus,
  type WaitlistQualification,
} from "@/app/_features/marketing/waitlist-lead";
import {
  sendWaitlistAdminNotificationEmail,
  sendWaitlistConfirmationEmail,
} from "@/app/_lib/email/waitlist-emails";
import { upsertWaitlistResendContact } from "@/app/_lib/email/resend-waitlist-audience";

export type ActionResponse<T = void> =
  | { success: true; data: T; alreadyJoined?: boolean }
  | { success: false; error: string };

type SaveWaitlistLeadInput = {
  email: string;
  source?: string;
  status: WaitlistLeadStatus;
  qualification?: Partial<WaitlistQualification>;
  lastStep?: string;
};

async function recordFunnelEvent(
  event: "waitlist_partial" | "waitlist_success",
  path: string,
  metadata: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("marketing_funnel_events").insert({
    event,
    path,
    metadata: metadata as Json,
  });

  if (error) {
    console.error(`marketing_funnel_events insert failed (${event}):`, error);
  }
}

export async function saveWaitlistLeadAction(
  data: SaveWaitlistLeadInput
): Promise<ActionResponse<void>> {
  try {
    const email = data.email?.trim();

    if (!email || !isValidWaitlistEmail(email)) {
      return { success: false, error: "Enter a valid email address." };
    }

    if (email.length > EMAIL_MAX_LENGTH) {
      return { success: false, error: "Enter a valid email address." };
    }

    const normalizedEmail = normalizeWaitlistEmail(email);
    const source = capSource(data.source);
    const status = data.status === "complete" ? "complete" : "partial";
    const qualification = sanitizeQualification(data.qualification);
    const lastStep = sanitizeLastStep(data.lastStep);

    const headerList = await headers();
    const clientIp = getClientIpFromHeaders(headerList);

    const emailLimit = checkRateLimit(
      createRateLimitKey("waitlist:email", normalizedEmail),
      RateLimitPresets.MODERATE
    );
    const ipLimit = checkRateLimit(
      createRateLimitKey("waitlist:ip", clientIp),
      RateLimitPresets.MODERATE
    );

    if (!emailLimit.allowed || !ipLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again." };
    }

    const supabase = createAdminClient();

    const { data: existingLead, error: selectError } = await supabase
      .from("waitlist_leads")
      .select("id, metadata")
      .eq("normalized_email", normalizedEmail)
      .maybeSingle();

    if (selectError) {
      console.error("Error loading waitlist lead:", selectError);
      return {
        success: false,
        error: "We could not save your spot. Please try again.",
      };
    }

    const existingMetadata = existingLead?.metadata as
      | Record<string, unknown>
      | null
      | undefined;
    const wasComplete = Boolean(
      existingMetadata &&
        typeof existingMetadata === "object" &&
        existingMetadata.status === "complete"
    );
    const isFirstWrite = !existingLead;

    const metadata = mergeWaitlistMetadata(existingMetadata, {
      status,
      qualification,
      lastStep,
      source,
    });

    const row = buildWaitlistRow({ email, source, metadata });

    const { error: upsertError } = await supabase
      .from("waitlist_leads")
      .upsert(row, { onConflict: "normalized_email" });

    if (upsertError) {
      console.error("Error saving waitlist lead:", upsertError);
      return {
        success: false,
        error: "We could not save your spot. Please try again.",
      };
    }

    const path =
      headerList.get("referer")?.trim() ||
      headerList.get("x-pathname")?.trim() ||
      "/waitlist";

    const cookieStore = await cookies();
    const consentValue = cookieStore.get(CONSENT_COOKIE_NAME)?.value;
    const analyticsAllowed = hasAnalyticsConsent(
      parseConsentCookie(
        consentValue ? decodeURIComponent(consentValue) : undefined
      )
    );

    if (analyticsAllowed && isFirstWrite && status === "partial") {
      void recordFunnelEvent("waitlist_partial", path, {
        source,
        last_step: metadata.last_step ?? "email",
      });
    }

    if (status === "complete" && !wasComplete) {
      if (analyticsAllowed) {
        void recordFunnelEvent("waitlist_success", path, {
          source,
          last_step: metadata.last_step,
        });
      }

      // Must await — fire-and-forget is dropped when the serverless action returns (Vercel).
      const notifyPayload = {
        email: email.trim(),
        source,
        qualification: metadata.qualification,
        completedAt:
          typeof metadata.completed_at === "string"
            ? metadata.completed_at
            : undefined,
      };

      const [confirmationResult, adminResult, audienceResult] =
        await Promise.allSettled([
          sendWaitlistConfirmationEmail({ to: email.trim() }),
          sendWaitlistAdminNotificationEmail(notifyPayload),
          upsertWaitlistResendContact({ email: email.trim() }),
        ]);

      if (confirmationResult.status === "rejected") {
        console.error(
          "Waitlist confirmation email failed:",
          confirmationResult.reason
        );
      }

      if (adminResult.status === "rejected") {
        console.error(
          "Waitlist admin notification failed:",
          adminResult.reason
        );
      }

      if (audienceResult.status === "rejected") {
        console.error(
          "Waitlist Resend audience sync failed:",
          audienceResult.reason
        );
      } else if (
        audienceResult.status === "fulfilled" &&
        !audienceResult.value.synced &&
        audienceResult.value.skippedReason
      ) {
        console.warn(
          "Waitlist Resend audience sync skipped:",
          audienceResult.value.skippedReason
        );
      }

    }

    return {
      success: true,
      data: undefined,
      alreadyJoined: wasComplete && status === "complete",
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Waitlist metadata exceeds size limit."
    ) {
      return {
        success: false,
        error: "We could not save your spot. Please try again.",
      };
    }

    console.error("Error in saveWaitlistLeadAction:", error);
    return {
      success: false,
      error: "We could not save your spot. Please try again.",
    };
  }
}
