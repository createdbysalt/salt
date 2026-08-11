import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { MemoryFile } from "./data";
import { mapProjectFileToMemoryFile, type ProjectFileRow } from "./mapper";
import type {
  FileDetailRecord,
  FileActivityEvent,
  FileActivityType,
} from "./detail-types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import {
  mapNoteToActivityEntry,
  mapTagAssignmentToActivityEntry,
} from "@/app/_features/work/utils/activity";
import { mapNoteRow } from "@/app/_features/memory/types/taxonomies";
import {
  buildConnectionEntityNameMap,
  resolveConnectionEntityFromMap,
  UNRESOLVED_CONNECTION_LABEL,
  type EntityLinkRow,
} from "@/app/_features/memory/utils/resolve-connection-entities";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import { getEntitySourceHistory } from "@/app/_features/memory/queries/source-history";
import {
  mapFileLinkToActivityEntry,
  mapFileRecordBootstrapActivity,
} from "./utils/activity";
import { getFileWorkLinkMap } from "./utils/work-links";
import { getFileAttachmentBacklinkMap } from "./utils/attachment-backlinks";

type TagAssignmentRow = {
  resource_id: string;
  tag: { id: string; label: string } | { id: string; label: string }[] | null;
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function logQueryError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(context, error.message, error);
    return;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message =
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : undefined;
    const code = typeof record.code === "string" ? record.code : undefined;
    const details = record.details ?? undefined;
    const hint = typeof record.hint === "string" ? record.hint : undefined;

    console.error(
      context,
      [message, code, details, hint].filter(Boolean).join(" | ") ||
        JSON.stringify(record, Object.getOwnPropertyNames(record)),
    );
    return;
  }

  console.error(context, String(error));
}

function normalizeProjectFileRow(row: Record<string, unknown>): ProjectFileRow {
  return {
    id: String(row.id),
    file_name: String(row.file_name),
    file_type: (row.file_type as ProjectFileRow["file_type"]) ?? "file",
    mime_type: (row.mime_type as string | null) ?? null,
    size_bytes: (row.size_bytes as number | null) ?? null,
    external_url: (row.external_url as string | null) ?? null,
    category: (row.category as ProjectFileRow["category"]) ?? null,
    source_type: (row.source_type as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    person_id: (row.person_id as string | null) ?? null,
    organization_id: (row.organization_id as string | null) ?? null,
    uploaded_by: (row.uploaded_by as string | null) ?? null,
    ai_summary: (row.ai_summary as string | null) ?? null,
    brand_metadata: row.brand_metadata ?? null,
    is_operator_asset: (row.is_operator_asset as boolean | null) ?? false,
    person: null,
    org: null,
    project: null,
  };
}

export const getWorkspaceFiles = cache(async (): Promise<MemoryFile[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: files, error } = await supabase
    .from("resources")
    .select(
      `
      id,
      file_name,
      file_type,
      mime_type,
      size_bytes,
      external_url,
      category,
      description,
      created_at,
      updated_at,
      person_id,
      organization_id,
      uploaded_by,
      ai_summary,
      brand_metadata,
      is_operator_asset
    `,
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    logQueryError("Error fetching workspace files:", error);
    return [];
  }

  const rows = (files ?? []).map((row) => normalizeProjectFileRow(row as Record<string, unknown>));
  if (rows.length === 0) return [];

  const personIds = [...new Set(rows.map((row) => row.person_id).filter(Boolean))] as string[];
  const orgIds = [
    ...new Set(rows.map((row) => row.organization_id).filter(Boolean)),
  ] as string[];
  const workLinkMap = await getFileWorkLinkMap(
    supabase,
    workspace.id,
    rows.map((row) => row.id),
  );
  const backlinkMap = await getFileAttachmentBacklinkMap(
    supabase,
    workspace.id,
    rows.map((row) => row.id),
  );
  const projectIds = [...new Set(workLinkMap.values())];

  const [peopleResult, orgsResult, projectsResult, tagAssignmentsResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .in("id", personIds.length > 0 ? personIds : [EMPTY_UUID]),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .in("id", orgIds.length > 0 ? orgIds : [EMPTY_UUID]),
    supabase
      .from("work")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .in("id", projectIds.length > 0 ? projectIds : [EMPTY_UUID]),
    supabase
      .from("resource_tag_assignments")
      .select("resource_id, tag:resource_tags(id, label)")
      .in("resource_id", rows.map((row) => row.id)),
  ]);

  if (peopleResult.error) {
    logQueryError("Error fetching workspace file people:", peopleResult.error);
  }
  if (orgsResult.error) {
    logQueryError("Error fetching workspace file organizations:", orgsResult.error);
  }
  if (projectsResult.error) {
    logQueryError("Error fetching workspace file projects:", projectsResult.error);
  }
  if (tagAssignmentsResult.error) {
    logQueryError("Error fetching workspace file tags:", tagAssignmentsResult.error);
  }

  const personMap = new Map(
    (peopleResult.data ?? []).map((person) => [person.id, { id: person.id, name: person.name }]),
  );
  const orgMap = new Map(
    (orgsResult.data ?? []).map((org) => [org.id, { id: org.id, name: org.name }]),
  );
  const projectMap = new Map(
    (projectsResult.data ?? []).map((project) => [project.id, { id: project.id, name: project.name }]),
  );

  const tagsByFile = new Map<string, string[]>();
  for (const assignment of tagAssignmentsResult.data ?? []) {
    const tag = unwrapRelation(
      (assignment as TagAssignmentRow).tag as { id: string; label: string } | null,
    );
    if (!tag?.label) continue;
    const existing = tagsByFile.get(assignment.resource_id) ?? [];
    existing.push(tag.label);
    tagsByFile.set(assignment.resource_id, existing);
  }

  return rows.map((row) => {
    const person = row.person_id ? (personMap.get(row.person_id) ?? null) : null;
    const org = row.organization_id ? (orgMap.get(row.organization_id) ?? null) : null;
    const linkedWorkId = workLinkMap.get(row.id);
    const project = linkedWorkId ? (projectMap.get(linkedWorkId) ?? null) : null;
    const backlink = backlinkMap.get(row.id);
    return mapProjectFileToMemoryFile(
      {
        ...row,
        person,
        org,
        project,
        billing: backlink?.billing ?? null,
        meeting: backlink?.meeting ?? null,
      },
      tagsByFile.get(row.id) ?? [],
    );
  });
});

// ============================================================================
// File Detail Query
// ============================================================================

export const getFileDetail = cache(async (fileId: string): Promise<FileDetailRecord | null> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: file, error } = await supabase
    .from("resources")
    .select(
      `
      id,
      file_name,
      file_type,
      mime_type,
      size_bytes,
      external_url,
      category,
      description,
      created_at,
      updated_at,
      archived_at,
      person_id,
      organization_id,
      uploaded_by,
      ai_summary,
      ai_status,
      extracted_data,
      extraction_status,
      extraction_version,
      document_type,
      lifecycle_status,
      due_date,
      expiry_date,
      signed_date,
      total_amount_cents,
      currency,
      follow_up_suggested,
      follow_up_date,
      follow_up_reason,
      source_provider,
      source_origin,
      app_url,
      capture_source_url,
      source_external_id,
      source_reclassified_as_manual,
      is_operator_asset
    `,
    )
    .eq("id", fileId)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !file) {
    logQueryError("Error fetching file detail:", error);
    return null;
  }

  // Fetch tags
  const { data: tagAssignments } = await supabase
    .from("resource_tag_assignments")
    .select("tag:resource_tags(id, label)")
    .eq("resource_id", fileId);

  const tags: string[] = [];
  for (const assignment of tagAssignments ?? []) {
    const tag = unwrapRelation(
      (assignment as TagAssignmentRow).tag as { id: string; label: string } | null,
    );
    if (tag?.label) {
      tags.push(tag.label);
    }
  }

  // Fetch linked entities from entity_links table
  const { data: entityLinks } = await supabase
    .from("entity_links")
    .select("target_type, target_id")
    .eq("workspace_id", workspace.id)
    // Dual-read: legacy rows may still carry the pre-rename "file" spelling
    .in("source_type", ["resource", "file"])
    .eq("source_id", fileId);

  const linkedPeopleIds: string[] = [];
  const linkedOrgIds: string[] = [];
  const linkedWorkIds: string[] = [];

  for (const link of entityLinks ?? []) {
    if (link.target_type === "person") linkedPeopleIds.push(link.target_id);
    if (link.target_type === "org") linkedOrgIds.push(link.target_id);
    if (link.target_type === "work") linkedWorkIds.push(link.target_id);
  }

  // Also check direct linkage columns on the file row
  const row = file as Record<string, unknown>;
  const personId = (row.person_id as string | null) ?? null;
  const organizationId = (row.organization_id as string | null) ?? null;

  if (personId && !linkedPeopleIds.includes(personId)) {
    linkedPeopleIds.push(personId);
  }
  if (organizationId && !linkedOrgIds.includes(organizationId)) {
    linkedOrgIds.push(organizationId);
  }

  // Fetch linked entity names
  const [peopleResult, orgsResult, workResult] = await Promise.all([
    linkedPeopleIds.length > 0
      ? supabase
          .from("people")
          .select("id, name")
          .in("id", linkedPeopleIds)
      : Promise.resolve({ data: [] }),
    linkedOrgIds.length > 0
      ? supabase
          .from("organizations")
          .select("id, name")
          .in("id", linkedOrgIds)
      : Promise.resolve({ data: [] }),
    linkedWorkIds.length > 0
      ? supabase
          .from("work")
          .select("id, name")
          .in("id", linkedWorkIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    id: String(row.id),
    workspaceId: workspace.id,
    fileName: String(row.file_name),
    fileType: (row.file_type as FileDetailRecord["fileType"]) ?? "file",
    mimeType: (row.mime_type as string) ?? undefined,
    sizeBytes: (row.size_bytes as number) ?? undefined,
    category: (row.category as FileDetailRecord["category"]) ?? undefined,
    description: (row.description as string) ?? undefined,
    provider: (row.source_provider as FileDetailRecord["provider"]) ?? undefined,
    sourceOrigin: (row.source_origin as FileDetailRecord["sourceOrigin"]) ?? undefined,
    externalUrl: (row.external_url as string) ?? undefined,
    appUrl: (row.app_url as string) ?? undefined,
    captureSourceUrl: (row.capture_source_url as string) ?? undefined,
    sourceExternalId: (row.source_external_id as string) ?? undefined,
    sourceReclassifiedAsManual: (row.source_reclassified_as_manual as boolean) ?? false,
    aiSummary: (row.ai_summary as string) ?? undefined,
    aiStatus: (row.ai_status as string) ?? undefined,
    extractedData: (row.extracted_data as FileDetailRecord["extractedData"]) ?? undefined,
    extractionStatus: (row.extraction_status as FileDetailRecord["extractionStatus"]) ?? undefined,
    extractionVersion: (row.extraction_version as number) ?? undefined,
    documentType: (row.document_type as FileDetailRecord["documentType"]) ?? undefined,
    lifecycleStatus: (row.lifecycle_status as FileDetailRecord["lifecycleStatus"]) ?? undefined,
    dueDate: (row.due_date as string) ?? undefined,
    expiryDate: (row.expiry_date as string) ?? undefined,
    signedDate: (row.signed_date as string) ?? undefined,
    totalAmountCents: (row.total_amount_cents as number) ?? undefined,
    currency: (row.currency as string) ?? undefined,
    followUpSuggested: (row.follow_up_suggested as boolean) ?? false,
    followUpDate: (row.follow_up_date as string) ?? undefined,
    followUpReason: (row.follow_up_reason as string) ?? undefined,
    isOperatorAsset: (row.is_operator_asset as boolean | null) ?? false,
    projectId: linkedWorkIds[0] ?? undefined,
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    linkedPeople: (peopleResult.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
    })),
    linkedOrgs: (orgsResult.data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
    })),
    linkedWork: (workResult.data ?? []).map((w) => ({
      id: w.id,
      title: w.name,
    })),
    tags,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    archivedAt: (row.archived_at as string) ?? undefined,
  };
});

// ============================================================================
// File Activities Query
// ============================================================================

export const getFileActivities = cache(
  async (fileId: string): Promise<FileActivityEvent[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: activities, error } = await supabase
      .from("resource_activities")
      .select(
        `
        id,
        resource_id,
        activity_type,
        actor_id,
        actor_label,
        metadata,
        created_at
      `,
      )
      .eq("resource_id", fileId)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logQueryError("Error fetching file activities:", error);
      return [];
    }

    return (activities ?? []).map((row) => ({
      id: String(row.id),
      fileId: String(row.resource_id),
      activityType: row.activity_type as FileActivityType,
      actorId: (row.actor_id as string) ?? undefined,
      actorLabel: (row.actor_label as string) ?? undefined,
      metadata: (row.metadata as FileActivityEvent["metadata"]) ?? {},
      createdAt: String(row.created_at),
    }));
  },
);

export const getFileSupplementalActivity = cache(
  async (fileId: string): Promise<ProfileActivityTimelineEntry[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const [tagRows, linkRows, noteRows] = await Promise.all([
      supabase
        .from("resource_tag_assignments")
        .select("id, created_at, tag:resource_tags(label)")
        .eq("resource_id", fileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("entity_links")
        .select(
          "id, source_type, source_id, target_type, target_id, relation_type, created_at, created_by",
        )
        .eq("workspace_id", workspace.id)
        // Dual-read: legacy rows may still carry the pre-rename "file" spelling
        .or(
          `and(source_type.eq.resource,source_id.eq.${fileId}),and(target_type.eq.resource,target_id.eq.${fileId}),` +
            `and(source_type.eq.file,source_id.eq.${fileId}),and(target_type.eq.file,target_id.eq.${fileId})`,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("notes")
        .select(
          "id, entity_type, entity_id, title, content, note_kind, source, source_ref, confidence, status, author_type, is_pinned, tags, created_at",
        )
        .eq("workspace_id", workspace.id)
        // Dual-read: notes on resources predate the rename (free-text column)
        .in("entity_type", ["resource", "file"])
        .eq("entity_id", fileId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (tagRows.error) {
      logQueryError("Error fetching file tag activity:", tagRows.error);
    }
    if (linkRows.error) {
      logQueryError("Error fetching file link activity:", linkRows.error);
    }
    if (noteRows.error) {
      logQueryError("Error fetching file note activity:", noteRows.error);
    }

    const tagEntries = (tagRows.data ?? []).flatMap((row) => {
      const record = row as Record<string, unknown>;
      const tag = unwrapRelation(
        record.tag as { label?: string } | { label?: string }[] | null,
      );
      if (!tag?.label) return [];

      return [
        mapTagAssignmentToActivityEntry({
          id: record.id as string,
          tagLabel: tag.label,
          source: "manual",
          because: null,
          confidence: null,
          createdAt: record.created_at as string,
        }),
      ];
    });

    const links = (linkRows.data ?? []) as EntityLinkRow[];
    let linkEntries: ProfileActivityTimelineEntry[] = [];
    if (links.length > 0) {
      const nameMap = await buildConnectionEntityNameMap(supabase, links, "resource", fileId);

      linkEntries = links.map((link) => {
        const isOutgoing =
          (link.source_type === "resource" || link.source_type === "file") &&
          link.source_id === fileId;
        const otherType = isOutgoing ? link.target_type : link.source_type;
        const otherId = isOutgoing ? link.target_id : link.source_id;
        const resolved = resolveConnectionEntityFromMap(nameMap, otherType, otherId);

        return mapFileLinkToActivityEntry({
          id: link.id,
          targetType: otherType,
          targetLabel: resolved?.name ?? UNRESOLVED_CONNECTION_LABEL,
          targetHref: resolved?.href,
          createdAt: link.created_at,
        });
      });
    }

    const noteEntries = (noteRows.data ?? []).map((row) =>
      mapNoteToActivityEntry(mapNoteRow(row as Record<string, unknown>)),
    );

    return [...tagEntries, ...linkEntries, ...noteEntries];
  },
);

export const getFileActivityFeed = cache(
  async (
    fileId: string,
  ): Promise<{
    activities: FileActivityEvent[];
    supplementalActivity: ProfileActivityTimelineEntry[];
    sourceHistory: SourceHistoryEntry[];
  }> => {
    const [activities, supplemental, detail, sourceHistory] = await Promise.all([
      getFileActivities(fileId),
      getFileSupplementalActivity(fileId),
      getFileDetail(fileId),
      getEntitySourceHistory("resource", fileId).catch(() => []),
    ]);

    const bootstrap = detail ? mapFileRecordBootstrapActivity(detail, activities) : [];

    return {
      activities,
      supplementalActivity: [...supplemental, ...bootstrap],
      sourceHistory,
    };
  },
);
