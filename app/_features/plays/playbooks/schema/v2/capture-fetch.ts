import "server-only";

/**
 * Capture fetch source for the v2 playbook executor.
 *
 * "capture" is not a connector category — it's Salt's own capture_events
 * table. Playbooks like email-triage and email-digest fetch from it via
 * `fetch from: capture.<capability>`, which the executor routes here instead
 * of through the Composio category fetcher.
 *
 * Capabilities:
 * - get_classification: the stored email classification for one capture
 * - batch_digest_emails: last-N-hours mail the classifier marked batch_digest
 * - held_senders: unknown senders in the held pool (Memory-first policy)
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { EMAIL_SCAN_SOURCE_TYPES } from "@/app/_features/capture/adapters/categories/email";
import { listHeldSenders } from "@/app/_features/capture/services/relationship-discovery";

const MAX_DIGEST_EMAILS = 100;

export interface DigestEmailItem {
  capture_id: string;
  subject: string | null;
  sender_email: string | null;
  sender_name: string | null;
  category: string | null;
  priority_tier: string | null;
  occurred_at: string;
  deep_link: string | null;
}

export function isCaptureFetchCategory(category: string): boolean {
  return category === "capture";
}

export async function fetchCaptureSource(
  workspaceId: string,
  capability: string,
  where: Record<string, unknown> | undefined
): Promise<unknown> {
  switch (capability) {
    case "get_classification":
      return fetchClassification(workspaceId, where);
    case "batch_digest_emails":
      return fetchBatchDigestEmails(workspaceId, where);
    case "held_senders":
      return fetchHeldSenders(workspaceId, where);
    default:
      throw new Error(`Unknown capture capability "${capability}"`);
  }
}

/**
 * Returns the stored classification object (not an array) so templates can
 * reference `{{classification.category}}` and branch conditions can test
 * `classification.triage_action` directly.
 */
async function fetchClassification(
  workspaceId: string,
  where: Record<string, unknown> | undefined
): Promise<Record<string, unknown>> {
  const captureId = typeof where?.capture_id === "string" ? where.capture_id : null;
  if (!captureId) {
    throw new Error("capture.get_classification requires where.capture_id");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("capture_events")
    .select("enriched_metadata")
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load capture ${captureId}: ${error.message}`);
  }

  const metadata = (data?.enriched_metadata ?? {}) as Record<string, unknown>;
  const classification = metadata.email_classification as
    | Record<string, unknown>
    | undefined;

  if (!classification) {
    throw new Error(`Capture ${captureId} has no stored email classification`);
  }

  return classification;
}

async function fetchBatchDigestEmails(
  workspaceId: string,
  where: Record<string, unknown> | undefined
): Promise<DigestEmailItem[]> {
  const hours = typeof where?.hours === "number" ? where.hours : 24;
  const limit = Math.min(
    typeof where?.limit === "number" ? where.limit : 50,
    MAX_DIGEST_EMAILS
  );
  const cutoffIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("capture_events")
    .select("id, created_at, extracted_data, enriched_metadata")
    .eq("workspace_id", workspaceId)
    .in("source_type", [...EMAIL_SCAN_SOURCE_TYPES])
    .eq("enriched_metadata->email_classification->>triage_action", "batch_digest")
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load batch-digest emails: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const extracted = (row.extracted_data ?? {}) as Record<string, unknown>;
    const metadata = (row.enriched_metadata ?? {}) as Record<string, unknown>;
    const classification = (metadata.email_classification ?? {}) as Record<
      string,
      unknown
    >;

    return {
      capture_id: row.id as string,
      subject: (extracted.subject as string) ?? null,
      sender_email: (extracted.sender_email as string) ?? null,
      sender_name: (extracted.sender_name as string) ?? null,
      category: (classification.category as string) ?? null,
      priority_tier: (classification.priority_tier as string) ?? null,
      occurred_at: row.created_at as string,
      deep_link: (extracted.deep_link as string) ?? null,
    };
  });
}

async function fetchHeldSenders(
  workspaceId: string,
  where: Record<string, unknown> | undefined
): Promise<unknown[]> {
  const hours = typeof where?.hours === "number" ? where.hours : 24;
  const limit = typeof where?.limit === "number" ? where.limit : 25;
  return listHeldSenders(workspaceId, { lookbackHours: hours, limit });
}
