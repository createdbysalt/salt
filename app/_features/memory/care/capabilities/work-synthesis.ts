/**
 * Memory Care — Work Synthesis capability
 *
 * Periodic re-understanding of work records. Birth naming (evidence/
 * name-work.ts) names new records from one email; this pass re-reads the
 * accumulated context of existing records — linked captures, resource
 * filenames and excerpts, linked people/orgs — and proposes a canonical
 * name plus a one-line summary.
 *
 * Guardrails:
 * - User-set names are canonical: any correction on the work's name field
 *   skips the record forever (correction blocklist), and the pipeline's P8
 *   guard refuses re-proposing a corrected value.
 * - Proposals flow through the care bar (getCareFieldBar → memoryUpdateField
 *   with minThreshold): above the bar the rename applies and lands in
 *   salt_learnings (undoable from Me → Salt learned); below it the proposal
 *   parks as Watching evidence.
 * - Selection is bounded: new records, or records with fresh linked evidence
 *   since the last synthesis, throttled to one synthesis per record per
 *   week, capped per run. Cost scales with active work, not captures.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { getCorrectionBlocklist } from "@/app/_lib/learning/correction-blocklist";
import { getCareFieldBar } from "../decision-pipeline";
import {
  extractNamingContextFromCapture,
  proposeWorkSynthesis,
} from "@/app/_features/memory/evidence/name-work";
import { findPersonIdsByEmail } from "@/app/_features/memory/records/person-emails";
import { CARE_SETTINGS_SLUGS, type CareRunContext, type CareRunResult } from "../types";

/** Records born in this window are always synthesized. */
const NEW_WORK_DAYS = 14;
/** A synthesized record is eligible again after this long. */
const RESYNTH_AFTER_DAYS = 7;
/** Linked evidence newer than this counts as "fresh" for older records. */
const FRESH_EVIDENCE_DAYS = 14;
/** Hard cap on LLM calls per run. */
const MAX_SYNTHESES_PER_RUN = 25;
/** Below this confidence the proposal is noise — not even parked. */
const MIN_EMIT_CONFIDENCE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

interface WorkRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  capture_event_id: string | null;
  person_id: string | null;
  organization_id: string | null;
  billing_contact_id: string | null;
  service_id: string | null;
  metadata: Json | null;
}

interface FreshLink {
  target_id: string;
  created_at: string;
}

/** Read the last-synthesis marker off work.metadata (system bookkeeping). */
export function readSynthesizedAt(metadata: Json | null): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const marker = (metadata as Record<string, unknown>).work_synthesis;
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) {
    return null;
  }
  const at = (marker as Record<string, unknown>).synthesized_at;
  if (typeof at !== "string") return null;
  const time = new Date(at).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Pure selection: new records, or records with fresh linked evidence since
 * their last synthesis, throttled to one synthesis per record per week.
 */
export function filterSynthesisCandidates(
  works: WorkRow[],
  freshLinks: FreshLink[],
  now: number,
): WorkRow[] {
  const freshByWork = new Map<string, number[]>();
  for (const link of freshLinks) {
    const at = new Date(link.created_at).getTime();
    if (Number.isNaN(at)) continue;
    const list = freshByWork.get(link.target_id) ?? [];
    list.push(at);
    freshByWork.set(link.target_id, list);
  }

  return works.filter((work) => {
    const synthesizedAt = readSynthesizedAt(work.metadata);
    if (synthesizedAt && now - synthesizedAt < RESYNTH_AFTER_DAYS * DAY_MS) {
      return false;
    }
    const createdAt = new Date(work.created_at).getTime();
    if (now - createdAt < NEW_WORK_DAYS * DAY_MS) return true;
    const fresh = freshByWork.get(work.id) ?? [];
    return fresh.some((at) => !synthesizedAt || at > synthesizedAt);
  });
}

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

type AdminClient = ReturnType<typeof createAdminClient>;

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const ORPHAN_CAPTURE_LIMIT = 10;
const ORPHAN_RESOURCE_LIMIT = 5;

/**
 * Capture sources that never carry deliverable evidence: meeting/call titles
 * ("CLC x SALT | Check-In") and payment memos ("Good Company") produced the
 * first pass's bad renames. Communication and file sources stay.
 */
const ORPHAN_EXCLUDED_SOURCES = [
  "googlecalendar",
  "outlook_calendar",
  "calendly",
  "calcom",
  "fireflies",
  "granola",
  "zoom",
  "stripe",
  "quickbooks",
  "square",
  "mercury",
];

export interface OrphanIdentity {
  personId: string | null;
  organizationId: string | null;
}

const NO_IDENTITY: OrphanIdentity = { personId: null, organizationId: null };

/**
 * Orphan fallback, identity-first: a work record with no birth capture and
 * no linked resources still has evidence in the workspace, but the ONLY safe
 * way to find it is through a precisely resolved identity — the exact email
 * or exact full name behind the placeholder name. Searching by name parts
 * crosses identities (the workspace has two unrelated "Chris"es at
 * goodcompany.com / goodcompany.ca — parts matched both and produced the
 * "Good Company Project" rename).
 *
 * Returns the resolved person/org ids so the run can also CONNECT the
 * record — the name is deliverable-only, so the person/org link is what
 * ties the work to its client.
 */
async function gatherOrphanContext(
  admin: AdminClient,
  workspaceId: string,
  work: WorkRow,
  into: {
    subjects: string[];
    bodyExcerpts: string[];
    documentNames: string[];
    knownEntityNames: string[];
  },
): Promise<OrphanIdentity> {
  const stripped = work.name.replace(/\s+—\s+Project$/i, "").trim();
  if (!stripped) return NO_IDENTITY;
  const emailShaped = looksLikeEmail(stripped);

  // 1. Resolve the person precisely: exact email, else exact full name.
  //    Ambiguity (more than one match) resolves to nobody.
  let personId: string | null = null;
  if (emailShaped) {
    const ids = await findPersonIdsByEmail(admin, workspaceId, stripped);
    personId = ids.length === 1 ? ids[0] : null;
  } else {
    const { data: people } = await admin
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .ilike("name", escapeIlike(stripped));
    const exact = (people ?? []).filter(
      (person) => normalizeName(person.name ?? "") === normalizeName(stripped),
    );
    personId = exact.length === 1 ? exact[0].id : null;
  }

  // A name-shaped placeholder that resolves to nobody precise has no
  // identity to search by — and name-part searches cross identities.
  if (!personId && !emailShaped) return NO_IDENTITY;

  // 2. Exact addresses to search by: the person's known emails (primary +
  //    person_emails), or the placeholder email itself.
  let emails: string[] = [];
  let organizationId: string | null = null;
  let orgName: string | null = null;
  if (personId) {
    const { data: person } = await admin
      .from("people")
      .select("name, email")
      .eq("id", personId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (person?.name) into.knownEntityNames.push(person.name);
    const { data: emailRows } = await admin
      .from("person_emails")
      .select("email")
      .eq("workspace_id", workspaceId)
      .eq("person_id", personId);
    emails = [
      ...new Set(
        [person?.email, ...(emailRows ?? []).map((row) => row.email)]
          .filter((email): email is string => Boolean(email))
          .map((email) => email.toLowerCase()),
      ),
    ];

    // The person's organization (person → org entity link) scopes the
    // resource search and becomes the record's org connection.
    const { data: orgLinks } = await admin
      .from("entity_links")
      .select("target_id")
      .eq("workspace_id", workspaceId)
      .eq("source_type", "person")
      .eq("source_id", personId)
      .eq("target_type", "org")
      .limit(1);
    const orgId = orgLinks?.[0]?.target_id;
    if (orgId) {
      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .maybeSingle();
      if (org?.name) {
        organizationId = orgId;
        orgName = org.name;
        into.knownEntityNames.push(org.name);
      }
    }
  } else {
    emails = [stripped.toLowerCase()];
  }

  // 3. Captures involving those exact addresses, both directions of the
  //    envelope. Meeting titles and payment memos are excluded.
  if (emails.length > 0) {
    const emailFilter = emails
      .map(
        (email) =>
          `extracted_data->>sender_email.ilike.%${escapeIlike(email)}%,extracted_data->>to.ilike.%${escapeIlike(email)}%`,
      )
      .join(",");
    const { data: captures } = await admin
      .from("capture_events")
      .select("extracted_data, raw_payload")
      .eq("workspace_id", workspaceId)
      .not("source_type", "in", `(${ORPHAN_EXCLUDED_SOURCES.join(",")})`)
      .or(emailFilter)
      .order("created_at", { ascending: false })
      .limit(ORPHAN_CAPTURE_LIMIT);

    for (const capture of captures ?? []) {
      const naming = extractNamingContextFromCapture(
        capture.extracted_data,
        capture.raw_payload,
      );
      if (naming.subject) into.subjects.push(naming.subject);
      if (naming.bodyExcerpt) into.bodyExcerpts.push(naming.bodyExcerpt);
      into.documentNames.push(...naming.attachmentNames);
    }
  }

  // 4. Resources for the person's organization — agreement/SOW filenames
  //    ("SERVICE AGREEMENT | CLC") are the strongest deliverable evidence.
  if (orgName) {
    const pattern = `%${escapeIlike(orgName)}%`;
    const { data: resources } = await admin
      .from("resources")
      .select("file_name, ai_summary")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .or(`file_name.ilike.${pattern},ai_summary.ilike.${pattern}`)
      .limit(ORPHAN_RESOURCE_LIMIT);

    for (const resource of resources ?? []) {
      if (resource.file_name) into.documentNames.push(resource.file_name);
      if (resource.ai_summary) into.bodyExcerpts.push(resource.ai_summary);
    }
  }

  return { personId, organizationId };
}

/** Gather the naming context for one work record. */
async function gatherWorkContext(
  admin: AdminClient,
  workspaceId: string,
  work: WorkRow,
): Promise<{
  subjects: string[];
  bodyExcerpts: string[];
  documentNames: string[];
  knownEntityNames: string[];
  /** Identity resolved by the orphan fallback (null when evidence was linked). */
  orphanIdentity: OrphanIdentity;
}> {
  const subjects: string[] = [];
  const bodyExcerpts: string[] = [];
  const documentNames: string[] = [];
  const knownEntityNames: string[] = [];

  // Birth capture: subject + snippet + attachment filenames.
  if (work.capture_event_id) {
    const { data: capture } = await admin
      .from("capture_events")
      .select("extracted_data, raw_payload")
      .eq("id", work.capture_event_id)
      .maybeSingle();
    if (capture) {
      const naming = extractNamingContextFromCapture(
        capture.extracted_data,
        capture.raw_payload,
      );
      if (naming.subject) subjects.push(naming.subject);
      if (naming.bodyExcerpt) bodyExcerpts.push(naming.bodyExcerpt);
      documentNames.push(...naming.attachmentNames);
    }
  }

  // Linked resources: filenames are document evidence ("Playground Website
  // Service Agreement.pdf"); excerpts/summaries carry the document's words.
  const { data: links } = await admin
    .from("entity_links")
    .select("source_id")
    .eq("workspace_id", workspaceId)
    .in("source_type", ["resource", "file"])
    .eq("target_type", "work")
    .eq("target_id", work.id)
    .limit(10);

  const resourceIds = (links ?? []).map((link) => link.source_id);
  if (resourceIds.length > 0) {
    const { data: resources } = await admin
      .from("resources")
      .select("file_name, ai_summary, extracted_data")
      .eq("workspace_id", workspaceId)
      .in("id", resourceIds)
      .is("deleted_at", null)
      .limit(10);
    for (const resource of resources ?? []) {
      if (resource.file_name) documentNames.push(resource.file_name);
      if (resource.ai_summary) bodyExcerpts.push(resource.ai_summary);
      const extracted = resource.extracted_data;
      if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
        const excerpt = (extracted as Record<string, unknown>).source_excerpt;
        if (typeof excerpt === "string" && excerpt.trim()) {
          bodyExcerpts.push(excerpt);
        }
      }
    }
  }

  // Linked people/orgs: collision guard for the "never a person's name" rule.
  const personIds = [work.person_id, work.billing_contact_id].filter(
    (id): id is string => Boolean(id),
  );
  const [peopleResult, orgResult] = await Promise.all([
    personIds.length > 0
      ? admin.from("people").select("name").in("id", personIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as Array<{ name: string | null }> }),
    work.organization_id
      ? admin
          .from("organizations")
          .select("name")
          .eq("id", work.organization_id)
          .is("deleted_at", null)
          .limit(1)
      : Promise.resolve({ data: [] as Array<{ name: string | null }> }),
  ]);
  for (const row of peopleResult.data ?? []) {
    if (row.name) knownEntityNames.push(row.name);
  }
  for (const row of orgResult.data ?? []) {
    if (row.name) knownEntityNames.push(row.name);
  }

  // Orphan fallback: nothing linked at all — resolve the identity behind
  // the placeholder name precisely, then search by it.
  const context = { subjects, bodyExcerpts, documentNames, knownEntityNames };
  let orphanIdentity: OrphanIdentity = NO_IDENTITY;
  if (
    subjects.length === 0 &&
    bodyExcerpts.length === 0 &&
    documentNames.length === 0
  ) {
    orphanIdentity = await gatherOrphanContext(admin, workspaceId, work, context);
  }

  return { ...context, orphanIdentity };
}

/** Stamp the synthesis marker so the record is throttled for a week. */
async function markSynthesized(
  admin: AdminClient,
  workspaceId: string,
  work: WorkRow,
): Promise<void> {
  const existing =
    work.metadata && typeof work.metadata === "object" && !Array.isArray(work.metadata)
      ? (work.metadata as Record<string, unknown>)
      : {};
  await admin
    .from("work")
    .update({
      metadata: {
        ...existing,
        work_synthesis: { synthesized_at: new Date().toISOString() },
      },
    })
    .eq("id", work.id)
    .eq("workspace_id", workspaceId);
}

/**
 * Connect a record to its person/org/service through the same care bar as
 * renames: above the bar the link applies (and lands in salt_learnings),
 * below it parks as Watching evidence.
 */
async function proposeConnection(
  workspaceId: string,
  work: WorkRow,
  field: "person_id" | "organization_id" | "service_id",
  value: string,
  confidence: number,
  because: string,
): Promise<boolean> {
  const { bar } = await getCareFieldBar(workspaceId, "work", field, value, null);
  const result = await memoryUpdateField({
    workspaceId,
    entityType: "work",
    entityId: work.id,
    field,
    value,
    confidence,
    because,
    source: "care",
    sourceDetails: { playbookSlug: CARE_SETTINGS_SLUGS["work-synthesis"] },
    minThreshold: bar,
  });
  return result.action === "applied";
}

/** Exact identity resolution (email/full-name) justifies high confidence. */
const IDENTITY_CONNECTION_CONFIDENCE = 90;

export async function runWorkSynthesisCapability(
  ctx: CareRunContext,
): Promise<CareRunResult> {
  const { workspaceId } = ctx;
  if (!workspaceId) {
    return { success: false, error: "No workspace context" };
  }

  const admin = createAdminClient();
  const now = Date.now();

  const { data: works } = await admin
    .from("work")
    .select(
      "id, name, description, created_at, capture_event_id, person_id, organization_id, billing_contact_id, service_id, metadata",
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const workRows = (works ?? []) as WorkRow[];
  if (workRows.length === 0) {
    return { success: true, summary: "No work records", data: { evaluated: 0 } };
  }

  // The workspace's services are the naming vocabulary: when the work
  // matches one, its exact name wins and the record links to it.
  const { data: serviceRows } = await admin
    .from("workspace_services")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);
  const services = (serviceRows ?? []) as Array<{ id: string; name: string }>;
  const serviceNames = services.map((service) => service.name);

  // Fresh linked evidence for older records (one query for all candidates).
  const { data: freshLinks } = await admin
    .from("entity_links")
    .select("target_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("target_type", "work")
    .in("source_type", ["resource", "file"])
    .in(
      "target_id",
      workRows.map((w) => w.id),
    )
    .gte(
      "created_at",
      new Date(now - FRESH_EVIDENCE_DAYS * DAY_MS).toISOString(),
    );

  const candidates = filterSynthesisCandidates(
    workRows,
    (freshLinks ?? []) as FreshLink[],
    now,
  ).slice(0, MAX_SYNTHESES_PER_RUN);

  let synthesized = 0;
  let renamed = 0;
  let parked = 0;
  let connected = 0;
  let skippedUserNamed = 0;

  for (const work of candidates) {
    try {
      // User-set names are canonical — any correction on the name field
      // (a rename through Ask Salt, a "That's wrong" rollback) takes the
      // record out of synthesis permanently.
      const nameCorrections = await getCorrectionBlocklist(
        workspaceId,
        "work",
        work.id,
        "name",
      );
      if (nameCorrections.length > 0) {
        skippedUserNamed++;
        continue;
      }

      const { orphanIdentity, ...namingContext } = await gatherWorkContext(
        admin,
        workspaceId,
        work,
      );
      const hasContext = Boolean(
        namingContext.subjects.length > 0 ||
          namingContext.bodyExcerpts.length > 0 ||
          namingContext.documentNames.length > 0,
      );

      // Connections: the name is deliverable-only, so the person/org links
      // are what tie the work to its client. A precisely resolved identity
      // connects even when there's too little evidence for a rename. Only
      // blanks are filled — existing links are never overwritten.
      if (orphanIdentity.personId && !work.person_id) {
        const applied = await proposeConnection(
          workspaceId,
          work,
          "person_id",
          orphanIdentity.personId,
          IDENTITY_CONNECTION_CONFIDENCE,
          "Counterparty resolved from the record's placeholder name (exact email/name match)",
        );
        if (applied) connected++;
      }
      if (orphanIdentity.organizationId && !work.organization_id) {
        const applied = await proposeConnection(
          workspaceId,
          work,
          "organization_id",
          orphanIdentity.organizationId,
          IDENTITY_CONNECTION_CONFIDENCE,
          "Organization resolved through the counterparty's person → org link",
        );
        if (applied) connected++;
      }

      // No evidence to read (orphaned record: no birth capture, no linked
      // resources, nothing found by identity) — skip WITHOUT stamping.
      // proposeWorkSynthesis returns null here anyway, and stamping would
      // suppress the record for a week even though no LLM call happened;
      // leaving it unstamped is free (no LLM call without context) and lets
      // it synthesize as soon as evidence lands.
      if (!hasContext) continue;

      const proposal = await proposeWorkSynthesis({
        workspaceId,
        currentName: work.name,
        services: serviceNames,
        ...namingContext,
      });

      if (proposal) {
        const wantsRename = Boolean(
          proposal.canonicalName &&
            normalizeName(proposal.canonicalName) !== normalizeName(work.name),
        );

        if (wantsRename && proposal.confidence >= MIN_EMIT_CONFIDENCE) {
          const { bar } = await getCareFieldBar(
            workspaceId,
            "work",
            "name",
            proposal.canonicalName,
            work.name,
          );
          const result = await memoryUpdateField({
            workspaceId,
            entityType: "work",
            entityId: work.id,
            field: "name",
            value: proposal.canonicalName!,
            confidence: proposal.confidence,
            because: "Re-understood from linked emails and documents",
            source: "care",
            sourceDetails: { playbookSlug: CARE_SETTINGS_SLUGS["work-synthesis"] },
            minThreshold: bar,
          });
          if (result.action === "applied") renamed++;
          else if (result.action === "accumulated") parked++;
        }

        // Summaries only fill blanks — an existing description is never
        // overwritten by a background pass.
        if (proposal.summary && !work.description) {
          const { bar } = await getCareFieldBar(
            workspaceId,
            "work",
            "description",
            proposal.summary,
            null,
          );
          await memoryUpdateField({
            workspaceId,
            entityType: "work",
            entityId: work.id,
            field: "description",
            value: proposal.summary,
            confidence: proposal.confidence,
            because: "Summary from linked emails and documents",
            source: "care",
            sourceDetails: { playbookSlug: CARE_SETTINGS_SLUGS["work-synthesis"] },
            minThreshold: bar,
          });
        }

        // Service match: link the record to the workspace service the work
        // matches (the name already uses the service's exact wording).
        if (proposal.matchedService && !work.service_id) {
          const service = services.find(
            (entry) => entry.name === proposal.matchedService,
          );
          if (service) {
            const applied = await proposeConnection(
              workspaceId,
              work,
              "service_id",
              service.id,
              proposal.confidence,
              `Work matches the "${service.name}" service`,
            );
            if (applied) connected++;
          }
        }
      }

      await markSynthesized(admin, workspaceId, work);
      synthesized++;
    } catch (error) {
      // One record's failure never sinks the sweep.
      console.error(`[memory-care] work-synthesis failed for work ${work.id}:`, error);
    }
  }

  return {
    success: true,
    summary: `Synthesized ${synthesized} work record(s): ${renamed} renamed, ${connected} connected, ${parked} parked to Watching`,
    data: {
      evaluated: workRows.length,
      candidates: candidates.length,
      synthesized,
      renamed,
      connected,
      parked,
      skippedUserNamed,
      updates: renamed,
    },
  };
}
