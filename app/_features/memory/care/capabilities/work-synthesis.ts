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

  return { subjects, bodyExcerpts, documentNames, knownEntityNames };
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
      "id, name, description, created_at, capture_event_id, person_id, organization_id, billing_contact_id, metadata",
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

      const context = await gatherWorkContext(admin, workspaceId, work);
      const proposal = await proposeWorkSynthesis({
        workspaceId,
        currentName: work.name,
        ...context,
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
    summary: `Synthesized ${synthesized} work record(s): ${renamed} renamed, ${parked} parked to Watching`,
    data: {
      evaluated: workRows.length,
      candidates: candidates.length,
      synthesized,
      renamed,
      parked,
      skippedUserNamed,
      updates: renamed,
    },
  };
}
