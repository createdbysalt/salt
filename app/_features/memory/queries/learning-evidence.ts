import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import type { LearningEntityType } from "@/app/_lib/learning";
import {
  classifyFieldTier,
  isAlwaysAutoField,
  tierBar,
} from "@/app/_lib/learning/field-tiers";
import { getCareThreshold } from "../care/settings";

export interface LearningEvidenceRow {
  id: string;
  workspace_id: string;
  entity_type: LearningEntityType;
  entity_id: string;
  field_path: string;
  proposed_value: unknown; // JSONB - can be string, number, object, etc.
  confidence: number;
  evidence_type: string;
  source_type: string;
  source_capture_id: string | null;
  playbook_slug: string | null;
  ttl_days: number | null;
  expires_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
}

export interface LearningEvidenceWithEntity extends LearningEvidenceRow {
  person: { id: string; name: string | null; email: string | null } | null;
  organization: { id: string; name: string | null } | null;
}

export interface LearningFieldEvidenceItem {
  id: string;
  sourceType: string;
  confidence: number;
  evidenceType: string;
  excerpt: string | null;
  playbookSlug: string | null;
  captureId: string | null;
  createdAt: string;
}

export interface LearningMetaCandidate {
  kind: "merge" | "archive" | "link";
  targetId?: string;
  targetName?: string;
}

export interface LearningField {
  fieldPath: string;
  proposedValue: string;
  confidence: number;
  sourceCount: number;
  sources: string[];
  latestAt: string;
  evidenceIds: string[];
  items: LearningFieldEvidenceItem[];
  /** Best human-readable reason ("because") across the field's evidence, if any. */
  topReason: string | null;
  /**
   * The tier-aware confidence bar this field must clear before Salt applies
   * it. Null/absent for meta candidates and always-auto fields.
   */
  bar?: number | null;
  /** Parsed hygiene operation (merge/archive/link) for "_" meta fields. */
  metaCandidate: LearningMetaCandidate | null;
}

export interface GroupedLearningEvidence {
  entityType: LearningEntityType;
  entityId: string;
  entityLabel: string;
  /** Canonical app route for the entity, when one exists. */
  entityHref: string | null;
  fields: LearningField[];
  totalConfidence: number;
  /** Most recent evidence across all fields. */
  latestAt: string;
}

function evidenceExcerpt(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const record = details as Record<string, unknown>;
  const candidates = ["excerpt", "snippet", "reason", "because", "summary", "context"];
  for (const key of candidates) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key];
    }
  }
  return null;
}

function getEntityHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "person":
      return `/people/${entityId}`;
    case "organization":
      return `/orgs/${entityId}`;
    case "work":
      return `/work/${entityId}`;
    case "meeting":
      return `/meetings/${entityId}`;
    case "billing":
      return `/billing/${entityId}`;
    case "file":
      return "/files";
    case "me":
      return "/me";
    default:
      return null;
  }
}

function parseMetaCandidate(
  fieldPath: string,
  proposedValue: unknown,
): LearningMetaCandidate | null {
  if (!fieldPath.startsWith("_")) return null;

  const kind =
    fieldPath === "_merge_candidate"
      ? "merge"
      : fieldPath === "_archive_candidate"
        ? "archive"
        : fieldPath === "_link_candidate"
          ? "link"
          : null;
  if (!kind) return null;

  const value =
    proposedValue && typeof proposedValue === "object"
      ? (proposedValue as Record<string, unknown>)
      : {};

  return {
    kind,
    targetId: typeof value.targetId === "string" ? value.targetId : undefined,
    targetName:
      typeof value.targetName === "string" ? value.targetName : undefined,
  };
}

function pickTopReason(items: LearningFieldEvidenceItem[]): string | null {
  let best: LearningFieldEvidenceItem | null = null;
  for (const item of items) {
    if (!item.excerpt) continue;
    if (!best || item.createdAt > best.createdAt) {
      best = item;
    }
  }
  return best?.excerpt ?? null;
}

function getDefaultLabel(entityType: string): string {
  switch (entityType) {
    case "person":
      return "Unknown Person";
    case "organization":
      return "Unknown Organization";
    case "work":
      return "Unknown Work";
    case "meeting":
      return "Unknown Meeting";
    case "file":
      return "Unknown File";
    case "billing":
      return "Billing Record";
    case "me":
      return "Your Profile";
    default:
      return "Unknown";
  }
}

export const getLearningEvidence = cache(
  async (workspaceId: string): Promise<GroupedLearningEvidence[]> => {
    const supabase = await createClient();
    const workspaceThreshold = await getCareThreshold(workspaceId);

    const { data: evidence, error } = await supabase
      .from("entity_evidence")
      .select(`
        id,
        workspace_id,
        entity_type,
        entity_id,
        field_path,
        proposed_value,
        confidence,
        evidence_type,
        evidence_details,
        source_type,
        source_capture_id,
        playbook_slug,
        ttl_days,
        expires_at,
        resolved_at,
        resolution,
        created_at
      `)
      .eq("workspace_id", workspaceId)
      .is("resolved_at", null)
      .order("confidence", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch learning evidence:", error.message, error.code, error.details);
      return [];
    }

    if (!evidence) {
      return [];
    }

    // Collect entity IDs by type for batch lookup
    const entityIdsByType: Record<string, string[]> = {
      person: [],
      organization: [],
      work: [],
      meeting: [],
      file: [],
      billing: [],
    };
    const seenIds = new Set<string>();

    for (const e of evidence) {
      const key = `${e.entity_type}:${e.entity_id}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        if (entityIdsByType[e.entity_type]) {
          entityIdsByType[e.entity_type].push(e.entity_id);
        }
      }
    }

    // Batch fetch entity labels for all Memory types
    const [
      { data: people },
      { data: orgs },
      { data: work },
      { data: meetings },
      { data: files },
      { data: billing },
    ] = await Promise.all([
      entityIdsByType.person.length > 0
        ? supabase
            .from("people")
            .select("id, name, email")
            .in("id", entityIdsByType.person)
            .is("deleted_at", null)
            .is("archived_at", null)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; email: string | null }> }),
      entityIdsByType.organization.length > 0
        ? supabase
            .from("organizations")
            .select("id, name")
            .in("id", entityIdsByType.organization)
            .is("deleted_at", null)
            .is("archived_at", null)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
      entityIdsByType.work.length > 0
        ? supabase
            .from("work")
            .select("id, name")
            .in("id", entityIdsByType.work)
            .is("deleted_at", null)
            .is("archived_at", null)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
      entityIdsByType.meeting.length > 0
        ? supabase
            .from("meetings")
            .select("id, title")
            .in("id", entityIdsByType.meeting)
            .is("deleted_at", null)
            .is("archived_at", null)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string | null }> }),
      entityIdsByType.file.length > 0
        ? supabase
            .from("files")
            .select("id, file_name")
            .in("id", entityIdsByType.file)
            .is("deleted_at", null)
            .is("archived_at", null)
        : Promise.resolve({ data: [] as Array<{ id: string; file_name: string | null }> }),
      entityIdsByType.billing.length > 0
        ? supabase
            .from("billing_records")
            .select("id, number")
            .in("id", entityIdsByType.billing)
            .is("deleted_at", null)
            .is("archived_at", null)
        : Promise.resolve({ data: [] as Array<{ id: string; number: string | null }> }),
    ]);

    // Build lookup maps
    const labelMaps: Record<string, Map<string, string>> = {
      person: new Map((people ?? []).map((p) => [p.id, p.name ?? p.email ?? "Unknown Person"])),
      organization: new Map((orgs ?? []).map((o) => [o.id, o.name ?? "Unknown Organization"])),
      work: new Map((work ?? []).map((w) => [w.id, w.name ?? "Unknown Work"])),
      meeting: new Map((meetings ?? []).map((m) => [m.id, m.title ?? "Unknown Meeting"])),
      file: new Map((files ?? []).map((f) => [f.id, f.file_name ?? "Unknown File"])),
      billing: new Map((billing ?? []).map((b) => [b.id, b.number ?? "Billing Record"])),
      me: new Map(),
    };

    const backedEntityTypes = new Set(["person", "organization", "work", "meeting", "file", "billing"]);

    function isInactiveMergeTarget(e: LearningEvidenceRow): boolean {
      if (e.field_path !== "_merge_candidate") return false;
      if (!e.proposed_value || typeof e.proposed_value !== "object") return false;
      const targetId = (e.proposed_value as Record<string, unknown>).targetId;
      return (
        typeof targetId === "string" &&
        backedEntityTypes.has(e.entity_type) &&
        !labelMaps[e.entity_type]?.has(targetId)
      );
    }

    const grouped = new Map<string, GroupedLearningEvidence>();

    for (const e of evidence) {
      if (isInactiveMergeTarget(e)) {
        continue;
      }

      const key = `${e.entity_type}:${e.entity_id}`;
      let group = grouped.get(key);

      if (!group) {
        // Look up entity label from the appropriate map
        const typeMap = labelMaps[e.entity_type];
        const entityLabel = typeMap?.get(e.entity_id);

        // Hide pending evidence for records that have since been archived or
        // deleted. Hygiene may have emitted these before the record left active
        // Memory, but Watching should only show actionable active records.
        if (!entityLabel && backedEntityTypes.has(e.entity_type)) {
          continue;
        }

        group = {
          entityType: e.entity_type as LearningEntityType,
          entityId: e.entity_id,
          entityLabel: entityLabel ?? getDefaultLabel(e.entity_type),
          entityHref: getEntityHref(e.entity_type, e.entity_id),
          fields: [],
          totalConfidence: 0,
          latestAt: e.created_at,
        };
        grouped.set(key, group);
      }

      // Convert JSONB to string for display/comparison
      const proposedValueStr = typeof e.proposed_value === "string"
        ? e.proposed_value
        : JSON.stringify(e.proposed_value);

      let field = group.fields.find(
        (f) => f.fieldPath === e.field_path && f.proposedValue === proposedValueStr
      );

      if (!field) {
        const metaCandidate = parseMetaCandidate(e.field_path, e.proposed_value);
        field = {
          fieldPath: e.field_path,
          proposedValue: proposedValueStr,
          confidence: 0,
          sourceCount: 0,
          sources: [],
          latestAt: e.created_at,
          evidenceIds: [],
          items: [],
          topReason: null,
          bar:
            metaCandidate || isAlwaysAutoField(e.entity_type, e.field_path)
              ? null
              : tierBar(
                  classifyFieldTier(
                    e.entity_type,
                    e.field_path,
                    e.proposed_value,
                  ),
                  workspaceThreshold,
                ),
          metaCandidate,
        };
        group.fields.push(field);
      }

      field.confidence = Math.max(field.confidence, e.confidence);
      field.sourceCount++;
      field.evidenceIds.push(e.id);
      field.items.push({
        id: e.id,
        sourceType: e.source_type,
        confidence: e.confidence,
        evidenceType: e.evidence_type,
        excerpt: evidenceExcerpt(e.evidence_details),
        playbookSlug: e.playbook_slug,
        captureId: e.source_capture_id,
        createdAt: e.created_at,
      });
      if (!field.sources.includes(e.source_type)) {
        field.sources.push(e.source_type);
      }
      if (e.created_at > field.latestAt) {
        field.latestAt = e.created_at;
      }
      if (e.created_at > group.latestAt) {
        group.latestAt = e.created_at;
      }
    }

    for (const group of grouped.values()) {
      group.totalConfidence = Math.max(...group.fields.map((f) => f.confidence));
      for (const field of group.fields) {
        field.topReason = pickTopReason(field.items);
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.totalConfidence - a.totalConfidence
    );
  }
);

export const getLearningEvidenceCount = cache(
  async (workspaceId: string): Promise<number> => {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("entity_evidence")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("resolved_at", null);

    if (error) {
      console.error("Failed to count learning evidence:", error);
      return 0;
    }

    return count ?? 0;
  }
);
