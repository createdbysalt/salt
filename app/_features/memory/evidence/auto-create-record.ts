"use server";

/**
 * Auto-Create Record Service
 *
 * P6: Records are born automatically; visibility comes after the fact.
 * Record creation must NOT route through the Plays Queue.
 *
 * This service creates records directly when evidence crosses the auto
 * threshold, without creating play_runs. The HQ widget queries
 * pending_evidence WHERE status='created' to show recent creations.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { IntakeEntityType } from "@/app/_features/memory/care/intake";
import type { ExtractedFieldValue } from "./types";

export interface AutoCreateRecordInput {
  workspaceId: string;
  evidenceId: string;
  entityType: IntakeEntityType;
  identifier: string;
  confidence: number;
  extractedFields: Record<string, ExtractedFieldValue>;
  signalCount: number;
}

export type AutoCreateRecordResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string };

const TABLE_MAP: Record<IntakeEntityType, string> = {
  person: "people",
  organization: "organizations",
  work: "work",
  billing: "billing_records",
  file: "files",
  meeting: "meetings",
};

/**
 * Map extracted field names to database column names.
 */
function mapFieldsToColumns(
  entityType: IntakeEntityType,
  fields: Record<string, ExtractedFieldValue>,
  workspaceId: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    workspace_id: workspaceId,
  };

  switch (entityType) {
    case "person":
      if (fields.name?.value) result.display_name = fields.name.value;
      if (fields.email?.value) result.email = fields.email.value;
      if (fields.phone?.value) result.phone = fields.phone.value;
      if (fields.title?.value) result.title = fields.title.value;
      break;

    case "organization":
      if (fields.name?.value) result.name = fields.name.value;
      if (fields.domain?.value) result.domain = fields.domain.value;
      if (fields.website?.value) result.website = fields.website.value;
      if (fields.billing_email?.value) result.billing_email = fields.billing_email.value;
      break;

    case "work":
      if (fields.name?.value) result.name = fields.name.value;
      if (fields.deadline?.value) result.deadline = fields.deadline.value;
      if (fields.work_type?.value) result.work_type = fields.work_type.value;
      break;

    case "billing":
      if (fields.number?.value) result.number = fields.number.value;
      if (fields.amount_cents?.value) {
        result.amount_cents = parseInt(fields.amount_cents.value) || null;
      }
      if (fields.due_at?.value) result.due_at = fields.due_at.value;
      break;

    case "file":
      if (fields.title?.value) result.title = fields.title.value;
      if (fields.category?.value) result.category = fields.category.value;
      if (fields.document_type?.value) result.document_type = fields.document_type.value;
      break;

    case "meeting":
      if (fields.title?.value) result.title = fields.title.value;
      if (fields.start_time?.value) result.start_time = fields.start_time.value;
      if (fields.location?.value) result.location = fields.location.value;
      if (fields.meeting_url?.value) result.meeting_url = fields.meeting_url.value;
      break;
  }

  return result;
}

/**
 * Auto-create a record when evidence crosses the auto threshold.
 *
 * This is the P6-compliant path: no play_runs, just direct record creation
 * with evidence tracking for HQ visibility.
 */
export async function autoCreateRecord(
  input: AutoCreateRecordInput,
): Promise<AutoCreateRecordResult> {
  const supabase = createAdminClient();

  const table = TABLE_MAP[input.entityType];
  const insertData = mapFieldsToColumns(
    input.entityType,
    input.extractedFields,
    input.workspaceId,
  );

  const { data, error } = await supabase
    .from(table)
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[auto-create-record] Record creation failed:", error);
    return { ok: false, error: error?.message ?? "Could not create record" };
  }

  const recordId = data.id as string;

  // Mark evidence as created — this powers the HQ "Created today" widget
  const { error: updateError } = await supabase
    .from("pending_evidence")
    .update({
      status: "created",
      created_record_id: recordId,
      created_at: new Date().toISOString(),
    })
    .eq("id", input.evidenceId);

  if (updateError) {
    console.error("[auto-create-record] Evidence update failed:", updateError);
  }

  return { ok: true, recordId };
}
