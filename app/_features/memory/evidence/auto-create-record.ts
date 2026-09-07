/**
 * Auto-Create Record Service
 *
 * Memory is fully autonomous: records are born automatically when evidence
 * crosses the entity's auto threshold — the threshold IS the auto-apply.
 * Record creation must NOT route through the Plays Queue.
 *
 * Internal module, not a server action: it writes with the admin client and
 * takes workspaceId from trusted pipeline callers, so it must not be
 * client-reachable (Sources plan 6.3 / INV-3). Only server modules import
 * it (evidence/add-signal.ts, evidence/route-intake-proposal.ts).
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
import { recordSaltLearning } from "@/app/_lib/learning/salt-learnings";
import { ensureUniqueProjectSlug } from "@/app/_features/memory/records/project-fields";
import { attachArtifactToEntity } from "@/app/_features/resources/actions/attach-artifact";
import {
  analyzeResourceContent,
  propagateStoredWorkTerms,
} from "@/app/_features/resources/services/content-analysis";
import { produceRecordTagFits } from "@/app/_features/capture/services/producers/record-tag-fit-producer";
import { extractNameFromEmail, isPlausiblePersonName } from "@/app/_features/memory/records/person-signals";
import { findPersonIdsByEmail } from "@/app/_features/memory/records/person-emails";
import {
  extractNamingContextFromCapture,
  proposeWorkName,
} from "./name-work";
import {
  getOperatorIdentity,
  isOperatorDomain,
  isOperatorEmail,
  isOperatorName,
  logOperatorRefusal,
} from "@/app/_lib/identity/operator";
import type { IntakeEntityType } from "@/app/_features/memory/care/intake";
import type { ExtractedFieldValue } from "./types";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface AutoCreateRecordInput {
  workspaceId: string;
  evidenceId: string;
  entityType: IntakeEntityType;
  identifier: string;
  confidence: number;
  extractedFields: Record<string, ExtractedFieldValue>;
  signalCount: number;
  /** Capture event that produced the evidence (record provenance). */
  captureId?: string;
}

export type AutoCreateRecordResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string };

type AdminClient = ReturnType<typeof createAdminClient>;

type InsertOutcome =
  | { id: string; linked?: boolean; label?: string }
  | { error: string };

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
      // Calendar invites often carry only an email address — derive the name
      // from the local part (same fallback the records engine uses) instead
      // of failing closed and parking the candidate forever.
      // Junk names (digits, role words like "Customer") fail the
      // plausibility gate: no person is born and the candidate stays parked
      // as evidence for the user to approve with a real name.
      const rawName =
        fields.name?.value ??
        (looksLikeEmail(input.identifier)
          ? extractNameFromEmail(input.identifier)
          : undefined);
      const name =
        rawName && isPlausiblePersonName(rawName) ? rawName : undefined;
      if (!name) return { error: "Missing required field: name" };
      // Evidence-born records are Salt extractions — stamp provenance at
      // birth so Source sections never claim the user added them.
      const insert: TablesInsert<"people"> = {
        workspace_id: workspaceId,
        name,
        source_origin: "extracted",
      };
      if (input.captureId) insert.capture_event_id = input.captureId;
      if (fields.email?.value) insert.email = fields.email.value;
      if (fields.phone?.value) insert.phone = fields.phone.value;
      if (fields.title?.value) insert.title = fields.title.value;
      return runInsert(supabase.from("people").insert(insert).select("id").single());
    }

    case "organization": {
      const name = fields.name?.value;
      if (!name) return { error: "Missing required field: name" };
      const insert: TablesInsert<"organizations"> = {
        workspace_id: workspaceId,
        name,
        source_origin: "extracted",
      };
      if (input.captureId) insert.capture_event_id = input.captureId;
      if (fields.domain?.value) insert.domain = fields.domain.value;
      if (fields.website?.value) insert.website = fields.website.value;
      if (fields.billing_email?.value) insert.billing_email = fields.billing_email.value;
      return runInsert(supabase.from("organizations").insert(insert).select("id").single());
    }

    case "work": {
      const name = await resolveWorkName(
        supabase,
        workspaceId,
        fields,
        input.captureId,
      );
      if (!name) return { error: "Missing required field: name" };
      const slug = await ensureUniqueProjectSlug(supabase, workspaceId, name);
      const insert: TablesInsert<"work"> = {
        workspace_id: workspaceId,
        name,
        slug,
        source_origin: "extracted",
      };
      if (input.captureId) insert.capture_event_id = input.captureId;
      if (fields.deadline?.value) insert.deadline = fields.deadline.value;
      const workType = Constants.public.Enums.work_type.find(
        (t) => t === fields.work_type?.value,
      );
      if (workType) insert.work_type = workType;
      const outcome = await runInsert(supabase.from("work").insert(insert).select("id").single());
      // Attach any resources born from the same capture/thread (the SOW or
      // proposal that birthed this work belongs on the record), then let
      // already-read documents fill this record's blanks — including
      // renaming a counterparty-anchored placeholder to the project name.
      if ("id" in outcome) {
        const linkedResourceIds = await linkResourceSiblings(
          supabase,
          input,
          "work",
          outcome.id,
        );
        for (const resourceId of linkedResourceIds) {
          try {
            const stored = await propagateStoredWorkTerms({
              workspaceId,
              resourceId,
            });
            if (stored === "no-analysis") {
              await analyzeResourceContent({ workspaceId, resourceId });
            }
          } catch (error) {
            console.error("auto-create work resource enrichment failed:", error);
          }
        }
        return { ...outcome, label: name };
      }
      return outcome;
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

      // billing_records enforces UNIQUE NULLS NOT DISTINCT on
      // (workspace_id, source_external_id) — a NULL source key allows
      // exactly one record per workspace, so evidence-born records always
      // carry one: the provider's external id when the identifier has it
      // (`stripe:ch_…`), else a synthetic key namespaced to the evidence.
      const sourceExternalId = billingSourceExternalId(
        input.identifier,
        input.evidenceId,
      );

      // Dedupe guard: the factual producer path (Stripe/QuickBooks) births
      // billing records directly under the same external id, so
      // proposal-lane evidence crossing the bar for the same invoice must
      // link, never double-create.
      const existingBillingId = await findExistingBilling(
        supabase,
        workspaceId,
        fields,
        sourceExternalId,
      );
      if (existingBillingId) return { id: existingBillingId, linked: true };

      const insert: TablesInsert<"billing_records"> = {
        workspace_id: workspaceId,
        amount_cents: amountCents,
        direction,
        source: "salt_inferred",
        source_external_id: sourceExternalId,
      };
      if (fields.number?.value) insert.number = fields.number.value;
      if (fields.due_at?.value) insert.due_at = fields.due_at.value;
      // app_url is a projection of the attached artifact Resource below.
      if (fields.app_url?.value) insert.app_url = fields.app_url.value;
      const outcome = await runInsert(supabase.from("billing_records").insert(insert).select("id").single());
      // Artifact-first: the hosted invoice page becomes a link Resource
      // attached to the new record. Failure to attach never blocks the
      // record — the lightweight fallback is "Add a link" on the record.
      if ("id" in outcome && fields.app_url?.value) {
        const artifact = await attachArtifactToEntity(supabase, {
          workspaceId,
          targetType: "billing",
          targetId: outcome.id,
          externalUrl: fields.app_url.value,
          displayName: fields.number?.value
            ? `Invoice ${fields.number.value}`
            : undefined,
          source: "capture",
          confidence: fields.app_url.confidence,
          because: "Hosted invoice page from the billing app",
          captureEventId: input.captureId,
        });
        if (!artifact.success) {
          console.error("auto-create billing artifact attach failed:", artifact.error);
        }
      }
      // A fresh record can already clear a tag fit (e.g. past-due on
      // creation). Tag-fit failure never blocks the record.
      if ("id" in outcome) {
        try {
          await produceRecordTagFits({
            workspaceId,
            entityType: "billing",
            entityId: outcome.id,
            source: "capture",
          });
        } catch (error) {
          console.error("auto-create billing tag-fit failed:", error);
        }
        // Attach the invoice document resource when one was born from the
        // same email thread.
        await linkResourceSiblings(supabase, input, "billing", outcome.id);
      }
      return outcome;
    }

    case "resource": {
      // Resources auto-create like every other entity type — the threshold
      // is the only gate. uploaded_by stays null (nullable
      // post-20260811120000); provenance lives on the capture.
      const fileName = fields.title?.value ?? fields.name?.value;
      if (!fileName) return { error: "Missing required field: title" };
      const insert: TablesInsert<"resources"> = {
        workspace_id: workspaceId,
        file_name: fileName,
        source: "capture",
        // Evidence-born rows carry no file bytes — valid_file_data exempts
        // system-authored resources (migration 20260830040000).
        created_by_system: true,
      };
      const category = Constants.public.Enums.file_category.find(
        (c) => c === fields.category?.value,
      );
      if (category) insert.category = category;
      if (fields.document_type?.value) insert.document_type = fields.document_type.value;
      if (input.captureId) insert.capture_event_id = input.captureId;
      // Email-born resources carry the source text so content analysis can
      // read the document's context — attachment bytes never leave the mail
      // provider, the email body is what we have.
      const excerpt = fields.source_excerpt?.value;
      if (excerpt) insert.extracted_data = { source_excerpt: excerpt };
      // Link the sender when they're a known person.
      const senderEmail = fields.from?.value;
      if (senderEmail) {
        const personId = await findPersonIdByEmail(
          supabase,
          workspaceId,
          senderEmail,
        );
        if (personId) insert.person_id = personId;
      }
      const outcome = await runInsert(supabase.from("resources").insert(insert).select("id").single());
      if ("id" in outcome) {
        // Category-driven fits (contract, signed) can clear at creation.
        try {
          await produceRecordTagFits({
            workspaceId,
            entityType: "resource",
            entityId: outcome.id,
            source: "capture",
          });
        } catch (error) {
          console.error("auto-create resource tag-fit failed:", error);
        }
        // Attach to sibling records born from the same capture/thread (the
        // work this contract belongs to, the billing record this invoice
        // documents) — the edges make the record useful immediately.
        await linkResourceSiblings(supabase, input, "resource", outcome.id);
        // Read the document: fills category/description/amounts/dates on the
        // resource and propagates commercial terms to linked work. Metered
        // at the LLM primitive inside; failure never blocks the birth.
        try {
          await analyzeResourceContent({
            workspaceId,
            resourceId: outcome.id,
          });
        } catch (error) {
          console.error("auto-create resource content analysis failed:", error);
        }
      }
      return outcome;
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
      if (existingId) return { id: existingId, linked: true };

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
 * Source key for an evidence-born billing record. Producer-born records
 * store the provider's bare external id (`ch_…`); the evidence identifier
 * prefixes it with the source (`stripe:ch_…`), so strip the prefix to
 * dedupe against them. Email-classified invoices have no provider id —
 * namespace the key to the evidence row so the NULLS NOT DISTINCT unique
 * constraint is never violated.
 */
function billingSourceExternalId(
  identifier: string,
  evidenceId: string,
): string {
  const prefixed = /^(stripe|quickbooks|honeybook|paypal|square):(.+)$/.exec(
    identifier,
  );
  if (prefixed) return prefixed[2];
  return `evidence:${evidenceId}`;
}

/**
 * Find an existing billing record this evidence would duplicate. Match on
 * the source key (producer-born records), then the invoice number
 * (case-insensitive), then the hosted page URL. Application-level only,
 * mirroring the meeting dedupe guard.
 */
async function findExistingBilling(
  supabase: AdminClient,
  workspaceId: string,
  fields: Record<string, ExtractedFieldValue>,
  sourceExternalId: string,
): Promise<string | null> {
  const { data: bySource } = await supabase
    .from("billing_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .eq("source_external_id", sourceExternalId)
    .limit(1)
    .maybeSingle();
  if (bySource) return bySource.id;

  const number = fields.number?.value;
  if (number) {
    const { data } = await supabase
      .from("billing_records")
      .select("id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .ilike("number", number)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  const appUrl = fields.app_url?.value;
  if (appUrl) {
    const { data } = await supabase
      .from("billing_records")
      .select("id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .eq("app_url", appUrl)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
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

function normalizeRecordName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (m) => `\\${m}`);
}

/**
 * True when a candidate work name exactly matches a known person or
 * organization — a thread artifact ("Sam Example" as the email subject),
 * never the project's name.
 */
async function matchesKnownEntityName(
  supabase: AdminClient,
  workspaceId: string,
  name: string,
): Promise<boolean> {
  const pattern = escapeIlike(name.trim());
  if (!pattern) return false;
  const [{ data: person }, { data: org }] = await Promise.all([
    supabase
      .from("people")
      .select("id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle(),
  ]);
  return Boolean(person ?? org);
}

/**
 * LLM naming from the source email's full context — subject, body excerpt,
 * and attachment filenames (a "Playground Website Service Agreement.pdf"
 * filename outranks a person-flavored subject like "Barrett on the Studio").
 * Every failure mode returns null and naming falls back to the deterministic
 * path: a birth never waits on the model.
 */
async function proposeWorkNameFromCapture(
  supabase: AdminClient,
  workspaceId: string,
  captureId: string,
  counterparty?: string,
): Promise<string | null> {
  const { data: capture } = await supabase
    .from("capture_events")
    .select("extracted_data, raw_payload")
    .eq("id", captureId)
    .maybeSingle();
  if (!capture) return null;
  const context = extractNamingContextFromCapture(
    capture.extracted_data,
    capture.raw_payload,
  );
  const proposal = await proposeWorkName({
    workspaceId,
    subject: context.subject,
    bodyExcerpt: context.bodyExcerpt,
    attachmentNames: context.attachmentNames,
    senderName: context.senderName,
    counterparty,
  });
  return proposal?.name ?? null;
}

/**
 * Work records are named for the work, never the client. A candidate that
 * exactly matches a known person/org (or the evidence's own counterparty)
 * is a thread artifact — anchor a placeholder to the counterparty until a
 * contract/SOW read renames it (content-analysis propagateWorkTerms).
 *
 * Precedence: (1) LLM proposal from the source email's context, (2) a
 * substantive subject-derived candidate, (3) the counterparty placeholder.
 */
async function resolveWorkName(
  supabase: AdminClient,
  workspaceId: string,
  fields: Record<string, ExtractedFieldValue>,
  captureId?: string,
): Promise<string | null> {
  const candidate = fields.name?.value?.trim();
  const counterparty = fields.counterparty?.value?.trim();

  if (captureId) {
    try {
      const proposed = await proposeWorkNameFromCapture(
        supabase,
        workspaceId,
        captureId,
        counterparty,
      );
      if (
        proposed &&
        !(await matchesKnownEntityName(supabase, workspaceId, proposed))
      ) {
        return proposed;
      }
    } catch (error) {
      console.error("[auto-create-record] LLM work naming failed:", error);
    }
  }

  if (candidate) {
    const sameAsCounterparty = Boolean(
      counterparty &&
        normalizeRecordName(candidate) === normalizeRecordName(counterparty),
    );
    if (
      !sameAsCounterparty &&
      !(await matchesKnownEntityName(supabase, workspaceId, candidate))
    ) {
      return candidate;
    }
  }

  const anchor = counterparty ?? candidate;
  return anchor ? `${anchor} — Project` : null;
}

/** Extract the bare address from a possibly-named From header. */
function bareEmail(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return (match?.[1] ?? value).trim().toLowerCase();
}

async function findPersonIdByEmail(
  supabase: AdminClient,
  workspaceId: string,
  email: string,
): Promise<string | null> {
  const address = bareEmail(email);
  if (!looksLikeEmail(address)) return null;
  // Resolve by any known address (person_emails identity set + primary).
  const ids = await findPersonIdsByEmail(supabase, workspaceId, address);
  if (ids.length === 0) return null;
  const { data } = await supabase
    .from("people")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", ids)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Entity types a resource attaches to as an artifact edge. */
const RESOURCE_LINK_TARGETS = new Set(["work", "billing"]);

/**
 * Attach a newborn record to its resource siblings (or vice versa): the
 * contract and the work it births often arrive on the same email thread
 * but cross their bars in different orders. Sibling births are found two
 * ways — evidence rows created from the same capture, and lane-prefixed
 * identifiers sharing the sender:subject thread key
 * (`file:a@b.com:sow` ↔ `work:a@b.com:sow`). Edges are idempotent and
 * failures never block the birth. Returns the ids of resources linked to
 * the new record (so callers can propagate stored document terms).
 */
async function linkResourceSiblings(
  supabase: AdminClient,
  input: AutoCreateRecordInput,
  entityType: IntakeEntityType,
  recordId: string,
): Promise<string[]> {
  const linkedResourceIds: string[] = [];
  try {
    const candidateIds = new Set<string>();

    if (input.captureId) {
      const { data: signalRows } = await supabase
        .from("pending_evidence_signals")
        .select("evidence_id")
        .eq("capture_id", input.captureId);
      for (const row of signalRows ?? []) {
        candidateIds.add(row.evidence_id as string);
      }
    }

    const lanePrefixes = ["file", "resource", "work", "billing"];
    const prefix = input.identifier.split(":")[0];
    if (lanePrefixes.includes(prefix)) {
      const suffix = input.identifier.slice(prefix.length + 1);
      const { data: threadRows } = await supabase
        .from("pending_evidence")
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .in(
          "identifier",
          lanePrefixes.map((p) => `${p}:${suffix}`),
        )
        .eq("status", "created");
      for (const row of threadRows ?? []) candidateIds.add(row.id as string);
    }

    candidateIds.delete(input.evidenceId);
    if (candidateIds.size === 0) return linkedResourceIds;

    const { data: siblings } = await supabase
      .from("pending_evidence")
      .select("entity_type, created_record_id")
      .eq("workspace_id", input.workspaceId)
      .in("id", [...candidateIds])
      .eq("status", "created")
      .not("created_record_id", "is", null);

    for (const sibling of siblings ?? []) {
      const siblingType =
        sibling.entity_type === "file" ? "resource" : (sibling.entity_type as string);
      const siblingRecordId = sibling.created_record_id as string;

      let resourceId: string | null = null;
      let targetType: string | null = null;
      let targetId: string | null = null;
      if (entityType === "resource" && RESOURCE_LINK_TARGETS.has(siblingType)) {
        resourceId = recordId;
        targetType = siblingType;
        targetId = siblingRecordId;
      } else if (
        siblingType === "resource" &&
        RESOURCE_LINK_TARGETS.has(entityType)
      ) {
        resourceId = siblingRecordId;
        targetType = entityType;
        targetId = recordId;
      }
      if (!resourceId || !targetType || !targetId) continue;

      const { data: existingEdge } = await supabase
        .from("entity_links")
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .eq("source_type", "resource")
        .eq("source_id", resourceId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();
      if (existingEdge) {
        if (entityType !== "resource") linkedResourceIds.push(resourceId);
        continue;
      }

      const { error } = await supabase.from("entity_links").insert({
        workspace_id: input.workspaceId,
        source_type: "resource",
        source_id: resourceId,
        target_type: targetType,
        target_id: targetId,
        relation_type: "attachment",
        source: "system",
        confidence: input.confidence,
        because: "Born from the same capture",
      });
      if (error) {
        console.error("[auto-create-record] sibling edge insert failed:", error);
      } else if (entityType !== "resource") {
        linkedResourceIds.push(resourceId);
      }
    }
  } catch (error) {
    console.error("[auto-create-record] sibling link failed:", error);
  }
  return linkedResourceIds;
}

/**
 * Display label for a freshly created record — the Handled row headline
 * reads "Added <label> to People". Falls back to a generic label per type;
 * a missing label must never block creation.
 */
function recordLabel(input: AutoCreateRecordInput): string {
  const fields = input.extractedFields;
  switch (input.entityType) {
    case "person":
    case "organization":
    case "work":
      return fields.name?.value ?? `Unnamed ${input.entityType}`;
    case "billing":
      return fields.number?.value
        ? `Invoice ${fields.number.value}`
        : "Billing record";
    case "resource":
      return fields.title?.value ?? fields.name?.value ?? "Resource";
    case "meeting":
      return fields.title?.value ?? "Meeting";
  }
}

/**
 * Handled audit trail: a born record surfaces in Memory → Activity →
 * Handled (same `field_path: "record"` convention as the system-plays
 * executor) with a "That's wrong" affordance that archives it. Logging
 * must never fail the creation — the record already exists by the time
 * this runs.
 */
async function logRecordBirth(
  input: AutoCreateRecordInput,
  recordId: string,
  labelOverride?: string,
): Promise<void> {
  try {
    const label = labelOverride ?? recordLabel(input);
    const signals = `${input.signalCount} intake signal${input.signalCount === 1 ? "" : "s"}`;
    await recordSaltLearning({
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: recordId,
      entityLabel: label,
      fieldPath: "record",
      fieldLabel: "Record",
      newValue: label,
      confidence: input.confidence,
      evidenceSummary: `Born from ${signals} that crossed the bar`,
      playbookSlug: "capture-intake",
    });
  } catch (error) {
    console.error("[auto-create-record] Handled learning log failed:", error);
  }
}

/**
 * Self-exclusion for the raw-insert path. This module bypasses the records
 * executor, so the operator guard must run here too — exact email/domain or
 * exact normalized full-name matches only, refusals logged.
 */
async function operatorRefusal(
  input: AutoCreateRecordInput,
): Promise<string | null> {
  if (input.entityType !== "person" && input.entityType !== "organization") {
    return null;
  }
  const identity = await getOperatorIdentity(input.workspaceId);
  const fields = input.extractedFields;

  if (input.entityType === "person") {
    const email =
      fields.email?.value ??
      (looksLikeEmail(input.identifier) ? input.identifier : undefined);
    if (isOperatorEmail(identity, email)) {
      return `${email} is the operator's own email`;
    }
    const name = fields.name?.value;
    if (isOperatorName(identity, name)) {
      return `"${name}" is the operator`;
    }
    return null;
  }

  const domain = fields.domain?.value ?? input.identifier;
  if (isOperatorDomain(identity, domain)) {
    return `${domain} is the operator's own domain`;
  }
  const name = fields.name?.value;
  if (isOperatorName(identity, name)) {
    return `"${name}" is the operator's business`;
  }
  return null;
}

/**
 * Auto-create a record when evidence crosses the auto threshold.
 *
 * Direct record creation with evidence tracking for HQ visibility — no
 * play_runs, no approval step.
 */
export async function autoCreateRecord(
  input: AutoCreateRecordInput,
): Promise<AutoCreateRecordResult> {
  const refusal = await operatorRefusal(input);
  if (refusal) {
    logOperatorRefusal(
      "auto-create-record",
      `${refusal} (workspace ${input.workspaceId}, evidence ${input.evidenceId})`,
    );
    return { ok: false, error: `Refusing to create ${input.entityType}: ${refusal}` };
  }

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

  // A dedupe-linked record isn't a birth — nothing new entered Memory.
  if (!inserted.linked) {
    await logRecordBirth(input, recordId, inserted.label);
  }

  return { ok: true, recordId };
}
