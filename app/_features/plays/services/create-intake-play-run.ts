import "server-only";

/**
 * Intake Play Run creation service.
 *
 * Creates play_runs for evidence-based record suggestions. When the evidence
 * accumulation system detects a potential new record (person, org, work, etc.),
 * it creates a play that appears in the approval queue.
 *
 * Two paths:
 * 1. "needs_you" - User approves, then record is created
 * 2. "auto_handled" - Record created automatically (if workspace allows)
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { routePlay, type PlayQueue, type PlayStakes } from "@/app/_features/plays/lib/play-record";
import type { IntakeEntityType } from "@/app/_features/memory/care/intake";
import type { ExtractedFieldValue } from "@/app/_features/memory/evidence/types";

export interface CreateIntakePlayRunInput {
  workspaceId: string;
  evidenceId: string;
  entityType: IntakeEntityType;
  identifier: string;
  confidence: number; // 0-100 probability
  extractedFields: Record<string, ExtractedFieldValue>;
  signalCount: number;
  /** If true, auto-create the record instead of queuing for approval. */
  autoCreate?: boolean;
}

export type CreateIntakePlayRunResult =
  | { ok: true; playRunId: string; autoHandled: boolean; createdRecordId?: string }
  | { ok: false; error: string };

const ENTITY_TYPE_LABELS: Record<IntakeEntityType, string> = {
  person: "Contact",
  organization: "Organization",
  work: "Project",
  billing: "Invoice",
  file: "File",
  meeting: "Meeting",
};

const ENTITY_TYPE_ICONS: Record<IntakeEntityType, string> = {
  person: "user",
  organization: "building",
  work: "briefcase",
  billing: "receipt",
  file: "file",
  meeting: "calendar",
};

function formatTitle(entityType: IntakeEntityType, fields: Record<string, ExtractedFieldValue>): string {
  const typeLabel = ENTITY_TYPE_LABELS[entityType];
  const name = fields.name?.value || fields.email?.value || fields.title?.value || fields.domain?.value;

  if (name) {
    return `Add ${name} as ${typeLabel}`;
  }
  return `Add new ${typeLabel}`;
}

function formatPreview(entityType: IntakeEntityType, fields: Record<string, ExtractedFieldValue>, signalCount: number): string {
  const parts: string[] = [];

  if (fields.email?.value) parts.push(fields.email.value);
  if (fields.domain?.value) parts.push(fields.domain.value);
  if (fields.organization?.value) parts.push(`at ${fields.organization.value}`);

  const signalText = signalCount === 1 ? "1 signal" : `${signalCount} signals`;

  if (parts.length > 0) {
    return `${parts.join(" · ")} (${signalText})`;
  }
  return `Detected from ${signalText}`;
}

/**
 * Stakes for record creation by entity type.
 * Creating records is generally medium stakes - it affects Memory but is reversible.
 */
function getStakes(entityType: IntakeEntityType): PlayStakes {
  switch (entityType) {
    case "billing":
      return "high"; // Financial records are high stakes
    case "work":
      return "medium"; // Projects affect workflow
    default:
      return "low"; // Contacts, files, meetings are easy to fix
  }
}

/**
 * Create a play_run for a suggested new record from evidence accumulation.
 *
 * The play appears in the queue and, when approved, creates the actual record
 * in Memory (person, organization, work, etc.).
 */
export async function createIntakePlayRun(
  input: CreateIntakePlayRunInput
): Promise<CreateIntakePlayRunResult> {
  const supabase = createAdminClient();

  const stakes = getStakes(input.entityType);
  const queue = input.autoCreate ? "auto_handled" : routePlay(input.confidence, stakes);
  const shouldAutoHandle = queue === "auto_handled";
  const state = shouldAutoHandle ? "approved" : "queued";

  const title = formatTitle(input.entityType, input.extractedFields);
  const preview = formatPreview(input.entityType, input.extractedFields, input.signalCount);

  const { data: run, error: insertError } = await supabase
    .from("play_runs")
    .insert({
      workspace_id: input.workspaceId,
      target_type: input.entityType,
      target_id: null, // Record doesn't exist yet
      target_label: input.extractedFields.name?.value || input.extractedFields.email?.value || input.identifier,
      state,
      queue,
      stakes,
      title,
      preview,
      confidence: input.confidence,
      source_context: {
        source: "playbook",
        playbook_slug: "memory-records",
        trigger_signal: "evidence_threshold_reached",
      },
      evidence_ids: [input.evidenceId],
      metadata: {
        playbook_name: "Memory Records",
        intake_record: true,
        entity_type: input.entityType,
        identifier: input.identifier,
        extracted_fields: input.extractedFields,
        signal_count: input.signalCount,
        icon: ENTITY_TYPE_ICONS[input.entityType],
        primary_label: `Add ${ENTITY_TYPE_LABELS[input.entityType]}`,
        trigger_label: `${input.signalCount} signals detected`,
      },
      approved_at: shouldAutoHandle ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError || !run) {
    return { ok: false, error: insertError?.message ?? "Could not create play run" };
  }

  // If auto-handled, create the record immediately
  let createdRecordId: string | undefined;
  if (shouldAutoHandle) {
    const createResult = await createRecordFromEvidence(
      input.workspaceId,
      input.entityType,
      input.extractedFields,
      input.evidenceId
    );
    if (createResult.ok) {
      createdRecordId = createResult.recordId;
    }
  }

  return { ok: true, playRunId: run.id as string, autoHandled: shouldAutoHandle, createdRecordId };
}

/**
 * Create the actual record from extracted evidence fields.
 * Called when auto-handling or when user approves the play.
 */
async function createRecordFromEvidence(
  workspaceId: string,
  entityType: IntakeEntityType,
  extractedFields: Record<string, ExtractedFieldValue>,
  evidenceId: string
): Promise<{ ok: true; recordId: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  // Build the record data from extracted fields
  const recordData: Record<string, string | null> = {
    workspace_id: workspaceId,
  };

  for (const [key, extracted] of Object.entries(extractedFields)) {
    if (extracted.value) {
      recordData[key] = extracted.value;
    }
  }

  // Determine the table based on entity type
  const tableMap: Record<IntakeEntityType, string> = {
    person: "people",
    organization: "organizations",
    work: "work",
    billing: "billing_records",
    file: "files",
    meeting: "meetings",
  };

  const table = tableMap[entityType];

  // Map extracted fields to table columns
  const insertData = mapFieldsToColumns(entityType, recordData);

  const { data, error } = await supabase
    .from(table)
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create record" };
  }

  // Mark evidence as created
  await supabase
    .from("pending_evidence")
    .update({
      status: "created",
      created_record_id: data.id,
      created_at: new Date().toISOString(),
    })
    .eq("id", evidenceId);

  return { ok: true, recordId: data.id as string };
}

/**
 * Map extracted field names to database column names.
 */
function mapFieldsToColumns(
  entityType: IntakeEntityType,
  fields: Record<string, string | null>
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    workspace_id: fields.workspace_id,
  };

  switch (entityType) {
    case "person":
      if (fields.name) result.display_name = fields.name;
      if (fields.email) result.email = fields.email;
      if (fields.phone) result.phone = fields.phone;
      if (fields.title) result.title = fields.title;
      break;

    case "organization":
      if (fields.name) result.name = fields.name;
      if (fields.domain) result.domain = fields.domain;
      if (fields.website) result.website = fields.website;
      if (fields.billing_email) result.billing_email = fields.billing_email;
      break;

    case "work":
      if (fields.name) result.name = fields.name;
      if (fields.deadline) result.deadline = fields.deadline;
      if (fields.work_type) result.work_type = fields.work_type;
      break;

    case "billing":
      if (fields.number) result.number = fields.number;
      if (fields.amount_cents) result.amount_cents = parseInt(fields.amount_cents) || null;
      if (fields.due_at) result.due_at = fields.due_at;
      break;

    case "file":
      if (fields.title) result.title = fields.title;
      if (fields.category) result.category = fields.category;
      if (fields.document_type) result.document_type = fields.document_type;
      break;

    case "meeting":
      if (fields.title) result.title = fields.title;
      if (fields.start_time) result.start_time = fields.start_time;
      if (fields.location) result.location = fields.location;
      if (fields.meeting_url) result.meeting_url = fields.meeting_url;
      break;
  }

  return result;
}

/**
 * Apply an intake play (create the record) when user approves it.
 * Called from play approval action.
 */
export async function applyIntakePlayRun(
  playRunId: string
): Promise<{ ok: true; recordId: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  // Get the play run with evidence ID
  const { data: playRun, error: fetchError } = await supabase
    .from("play_runs")
    .select("workspace_id, target_type, evidence_ids, metadata")
    .eq("id", playRunId)
    .single();

  if (fetchError || !playRun) {
    return { ok: false, error: fetchError?.message ?? "Play run not found" };
  }

  const metadata = playRun.metadata as {
    entity_type: IntakeEntityType;
    extracted_fields: Record<string, ExtractedFieldValue>;
  };

  const evidenceId = (playRun.evidence_ids as string[])?.[0];
  if (!evidenceId) {
    return { ok: false, error: "No evidence ID found" };
  }

  const result = await createRecordFromEvidence(
    playRun.workspace_id,
    metadata.entity_type,
    metadata.extracted_fields,
    evidenceId
  );

  if (result.ok) {
    // Update play run with created record ID
    await supabase
      .from("play_runs")
      .update({
        target_id: result.recordId,
        state: "ran",
      })
      .eq("id", playRunId);
  }

  return result;
}
