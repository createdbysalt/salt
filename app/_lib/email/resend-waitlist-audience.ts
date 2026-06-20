/**
 * Resend Audience sync for waitlist subscribers.
 * Create the audience in Resend Dashboard and set RESEND_WAITLIST_AUDIENCE_ID.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getResendClient } from "@/app/_lib/email/resend";

export function getWaitlistAudienceId(): string | undefined {
  const id = process.env.RESEND_WAITLIST_AUDIENCE_ID?.trim();
  return id && id.length > 0 ? id : undefined;
}

export async function upsertWaitlistResendContact(input: {
  email: string;
  unsubscribed?: boolean;
}): Promise<{ synced: boolean; contactId?: string; skippedReason?: string }> {
  const audienceId = getWaitlistAudienceId();
  if (!audienceId) {
    return {
      synced: false,
      skippedReason: "RESEND_WAITLIST_AUDIENCE_ID is not configured",
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
    throw new Error(`Resend contact create failed: ${error.message}`);
  }

  return { synced: true, contactId: data?.id };
}

export type WaitlistAudienceSyncResult = {
  total: number;
  synced: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
};

const COMPLETE_WAITLIST_PAGE_SIZE = 200;

function isCompleteWaitlistLead(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  return (metadata as Record<string, unknown>).status === "complete";
}

/**
 * Adds every completed waitlist signup to the Resend waitlist audience.
 * Idempotent — safe to re-run (existing contacts are treated as synced).
 */
export async function syncCompleteWaitlistLeadsToResendAudience(options?: {
  dryRun?: boolean;
  onProgress?: (processed: number, total: number) => void;
}): Promise<WaitlistAudienceSyncResult> {
  const audienceId = getWaitlistAudienceId();
  if (!audienceId && !options?.dryRun) {
    throw new Error(
      "RESEND_WAITLIST_AUDIENCE_ID is not configured. Create a Waitlist audience in Resend and set the env var."
    );
  }

  const supabase = createAdminClient();
  const emails: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("waitlist_leads")
      .select("email, metadata")
      .filter("metadata->>status", "eq", "complete")
      .order("created_at", { ascending: true })
      .range(offset, offset + COMPLETE_WAITLIST_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`waitlist_leads query failed: ${error.message}`);
    }

    if (!data?.length) {
      break;
    }

    for (const row of data) {
      if (!isCompleteWaitlistLead(row.metadata)) {
        continue;
      }
      const email = typeof row.email === "string" ? row.email.trim() : "";
      if (email.length > 0) {
        emails.push(email);
      }
    }

    if (data.length < COMPLETE_WAITLIST_PAGE_SIZE) {
      break;
    }
    offset += COMPLETE_WAITLIST_PAGE_SIZE;
  }

  const seen = new Set<string>();
  const uniqueEmails: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEmails.push(email);
    }
  }

  const result: WaitlistAudienceSyncResult = {
    total: uniqueEmails.length,
    synced: 0,
    skipped: 0,
    errors: [],
  };

  if (options?.dryRun) {
    result.skipped = uniqueEmails.length;
    return result;
  }

  for (let index = 0; index < uniqueEmails.length; index += 1) {
    const email = uniqueEmails[index];
    options?.onProgress?.(index + 1, uniqueEmails.length);

    try {
      const syncResult = await upsertWaitlistResendContact({ email });
      if (syncResult.synced) {
        result.synced += 1;
      } else {
        result.skipped += 1;
        if (syncResult.skippedReason) {
          result.errors.push({ email, error: syncResult.skippedReason });
        }
      }
    } catch (err) {
      result.errors.push({
        email,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}
