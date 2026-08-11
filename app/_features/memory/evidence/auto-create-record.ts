/**
 * Auto-Create Record Service
 *
 * P6: Records are born automatically; visibility comes after the fact.
 * Record creation must NOT route through the Plays Queue.
 *
 * Internal module, not a server action: it writes with the admin client and
 * takes workspaceId from trusted pipeline callers, so it must not be
 * client-reachable (Sources plan 6.3 / INV-3). Only server modules import
 * it (evidence/actions.ts, memory/actions/record-candidates.ts).
 *
 * This service creates records directly when evidence crosses the auto
 * threshold, without creating play_runs. The HQ widget queries
 * pending_evidence WHERE status='created' to show recent creations.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  Constants,
  type Json,
  type TablesInsert,
} from "@/app/_lib/supabase/database.types";
import { ensureUniqueProjectSlug } from "@/app/_features/capture/services/system-plays/project-fields";
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
  /**
   * Confirming user, when creation is driven by an explicit confirm (New
   * records lane). Required for resources — they stay confirm-only, so
   * background paths (no acting user) fail closed.
   */
  actingUserId?: string;
  /** Capture event that produced the evidence (record provenance). */
  captureId?: string;
}

export type AutoCreateRecordResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string };

type AdminClient = ReturnType<typeof createAdminClient>;

type InsertOutcome = { id: string } | { error: string };

async function runInsert(
  query: PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>,
): Promise<InsertOutcome> {
  const { data, error } = await query;
  if (error || !data) {
    return { error: error?.message ?? "Could not create record" };
  }
  return { id: data.id };
}

/**
 * Build and run the typed insert for each entity type. Required columns
 * without extracted values fail fast with a clear error instead of a
 * NOT NULL violation from the database.
 */
async function insertEntityRecord(
  supabase: AdminClient,
  input: AutoCreateRecordInput,
): Promise<InsertOutcome> {
  const fields = input.extractedFields;
  const workspaceId = input.workspaceId;

  switch (input.entityType) {
    case "person": {
      const name = fields.name?.value;
      if (!name) return { error: "Missing required field: name" };
      const insert: TablesInsert<"people"> = { workspace_id: workspaceId, name };
      if (fields.email?.value) insert.email = fields.email.value;
      if (fields.phone?.value) insert.phone = fields.phone.value;
      if (fields.title?.value) insert.title = fields.title.value;
      return runInsert(supabase.from("people").insert(insert).select("id").single());
    }

    case "organization": {
      const name = fields.name?.value;
      if (!name) return { error: "Missing required field: name" };
      const insert: TablesInsert<"organizations"> = { workspace_id: workspaceId, name };
      if (fields.domain?.value) insert.domain = fields.domain.value;
      if (fields.website?.value) insert.website = fields.website.value;
      if (fields.billing_email?.value) insert.billing_email = fields.billing_email.value;
      return runInsert(supabase.from("organizations").insert(insert).select("id").single());
    }

    case "work": {
      const name = fields.name?.value;
      if (!name) return { error: "Missing required field: name" };
      const slug = await ensureUniqueProjectSlug(supabase, workspaceId, name);
      const insert: TablesInsert<"work"> = { workspace_id: workspaceId, name, slug };
      if (fields.deadline?.value) insert.deadline = fields.deadline.value;
      const workType = Constants.public.Enums.work_type.find(
        (t) => t === fields.work_type?.value,
      );
      if (workType) insert.work_type = workType;
      return runInsert(supabase.from("work").insert(insert).select("id").single());
    }

    case "billing": {
      const amountCents = fields.amount_cents?.value
        ? parseInt(fields.amount_cents.value)
        : Number.NaN;
      const direction = Constants.public.Enums.billing_direction.find(
        (d) => d === fields.direction?.value,
      );
      if (!Number.isFinite(amountCents) || !direction) {
        return { error: "Missing required fields: amount_cents, direction" };
      }
      const insert: TablesInsert<"billing_records"> = {
        workspace_id: workspaceId,
        amount_cents: amountCents,
        direction,
      };
      if (fields.number?.value) insert.number = fields.number.value;
      if (fields.due_at?.value) insert.due_at = fields.due_at.value;
      return runInsert(supabase.from("billing_records").insert(insert).select("id").single());
    }

    case "resource": {
      // Resources stay confirm-only from background evidence paths (Phase 7
      // carves out artifact creation alongside billing/meeting records).
      // uploaded_by is nullable post-20260811120000, but only the confirm
      // path (New records lane, which passes actingUserId) creates them.
      if (!input.actingUserId) {
        return { error: "Resource records cannot be auto-created without an uploader" };
      }
      const fileName = fields.title?.value ?? fields.name?.value;
      if (!fileName) return { error: "Missing required field: title" };
      const insert: TablesInsert<"resources"> = {
        workspace_id: workspaceId,
        file_name: fileName,
        uploaded_by: input.actingUserId,
        source: "capture",
      };
      const category = Constants.public.Enums.file_category.find(
        (c) => c === fields.category?.value,
      );
      if (category) insert.category = category;
      if (fields.document_type?.value) insert.document_type = fields.document_type.value;
      if (input.captureId) insert.capture_event_id = input.captureId;
      return runInsert(supabase.from("resources").insert(insert).select("id").single());
    }

    case "meeting": {
      const title = fields.title?.value;
      const startTime = fields.start_time?.value;
      if (!title || !startTime) {
        return { error: "Missing required fields: title, start_time" };
      }

      // Dedupe guard: capture-driven creation overlaps cal-booking-processor
      // (calcom) and any external-id-keyed rows. Link, never double-create.
      const existingId = await findExistingMeeting(supabase, workspaceId, fields);
      if (existingId) return { id: existingId };

      const endTime = fields.end_time?.value ?? defaultMeetingEnd(startTime);
      if (!endTime) {
        return { error: "Missing required fields: start_time is not a valid date" };
      }

      const provider = fields.provider?.value;
      const insert: TablesInsert<"meetings"> = {
        workspace_id: workspaceId,
        title,
        start_time: startTime,
        end_time: endTime,
        source_origin: "found",
        origin: provider === "googlecalendar" ? "google" : null,
      };
      if (fields.location?.value) insert.address = fields.location.value;
      if (fields.meeting_url?.value) insert.meeting_url = fields.meeting_url.value;
      if (fields.external_event_id?.value) {
        insert.external_event_id = fields.external_event_id.value;
        insert.source_external_id = fields.external_event_id.value;
      }
      if (provider) {
        insert.external_provider = provider;
        const providerEnum = MEETING_PROVIDER_ENUM[provider];
        if (providerEnum) insert.provider = providerEnum;
      }
      if (input.captureId) insert.capture_event_id = input.captureId;
      if (fields.attendees?.value) {
        try {
          insert.attendees = JSON.parse(fields.attendees.value) as Json;
        } catch {
          // Malformed attendee payload — provenance stays on the capture.
        }
      }
      return runInsert(supabase.from("meetings").insert(insert).select("id").single());
    }
  }
}

/** entity_provider enum keys differ from capture source_types. */
const MEETING_PROVIDER_ENUM: Record<
  string,
  NonNullable<TablesInsert<"meetings">["provider"]>
> = {
  googlecalendar: "google-calendar",
  outlook_calendar: "outlook",
  calcom: "calcom",
  calendly: "calendly",
};

/** Ask Salt's createClientMeeting uses the same 30-minute default. */
function defaultMeetingEnd(startTime: string): string | null {
  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start + 30 * 60 * 1000).toISOString();
}

/**
 * Find an existing meetings row this capture would duplicate.
 *
 * 1. Exact external-id match — the capture's external id is checked against
 *    every key existing insert paths write (external_event_id from calendar
 *    syncs, source_external_id, cal_booking_id from cal-booking-processor).
 * 2. Fuzzy fallback — same workspace, identical case-insensitive title,
 *    start_time within ±2 minutes. Covers Ask Salt's createClientMeeting,
 *    which writes no external id.
 *
 * Application-level only: the dedupe keys carry partial indexes, no UNIQUE
 * constraint — acceptable at single-workspace capture volume.
 */
async function findExistingMeeting(
  supabase: AdminClient,
  workspaceId: string,
  fields: Record<string, ExtractedFieldValue>,
): Promise<string | null> {
  const externalId = fields.external_event_id?.value;

  if (externalId) {
    for (const column of [
      "external_event_id",
      "source_external_id",
      "cal_booking_id",
    ] as const) {
      const { data } = await supabase
        .from("meetings")
        .select("id")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .eq(column, externalId)
        .maybeSingle();
      if (data) return data.id;
    }
  }

  const title = fields.title?.value;
  const startTime = fields.start_time?.value;
  const start = startTime ? new Date(startTime).getTime() : Number.NaN;
  if (!title || Number.isNaN(start)) return null;

  const windowMs = 2 * 60 * 1000;
  const { data: candidates } = await supabase
    .from("meetings")
    .select("id, title, start_time")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .gte("start_time", new Date(start - windowMs).toISOString())
    .lte("start_time", new Date(start + windowMs).toISOString());

  const match = candidates?.find(
    (row) => row.title.trim().toLowerCase() === title.trim().toLowerCase(),
  );
  return match?.id ?? null;
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

  const inserted = await insertEntityRecord(supabase, input);

  if ("error" in inserted) {
    console.error("[auto-create-record] Record creation failed:", inserted.error);
    return { ok: false, error: inserted.error };
  }

  const recordId = inserted.id;

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
