import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { MemoryFile } from "./data";
import { mapProjectFileToMemoryFile, type ProjectFileRow } from "./mapper";

type TagAssignmentRow = {
  file_id: string;
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
    client_id: (row.client_id as string | null) ?? null,
    project_id: (row.project_id as string | null) ?? null,
    uploaded_by: String(row.uploaded_by),
    ai_summary: (row.ai_summary as string | null) ?? null,
    client: null,
    project: null,
  };
}

export const getWorkspaceFiles = cache(async (): Promise<MemoryFile[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: files, error } = await supabase
    .from("project_files")
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
      client_id,
      project_id,
      uploaded_by,
      ai_summary
    `,
    )
    .eq("workspace_id", workspace.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    logQueryError("Error fetching workspace files:", error);
    return [];
  }

  const rows = (files ?? []).map((row) => normalizeProjectFileRow(row as Record<string, unknown>));
  if (rows.length === 0) return [];

  const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))] as string[];
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter(Boolean))] as string[];

  const [clientsResult, projectsResult, tagAssignmentsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .in("id", clientIds.length > 0 ? clientIds : [EMPTY_UUID]),
    supabase
      .from("projects")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .in("id", projectIds.length > 0 ? projectIds : [EMPTY_UUID]),
    supabase
      .from("file_tag_assignments")
      .select("file_id, tag:file_tags(id, label)")
      .in("file_id", rows.map((row) => row.id)),
  ]);

  if (clientsResult.error) {
    logQueryError("Error fetching workspace file clients:", clientsResult.error);
  }
  if (projectsResult.error) {
    logQueryError("Error fetching workspace file projects:", projectsResult.error);
  }
  if (tagAssignmentsResult.error) {
    logQueryError("Error fetching workspace file tags:", tagAssignmentsResult.error);
  }

  const clientMap = new Map(
    (clientsResult.data ?? []).map((client) => [client.id, { id: client.id, name: client.name }]),
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
    const existing = tagsByFile.get(assignment.file_id) ?? [];
    existing.push(tag.label);
    tagsByFile.set(assignment.file_id, existing);
  }

  return rows.map((row) => {
    const client = row.client_id ? (clientMap.get(row.client_id) ?? null) : null;
    const project = row.project_id ? (projectMap.get(row.project_id) ?? null) : null;
    return mapProjectFileToMemoryFile(
      { ...row, client, project },
      tagsByFile.get(row.id) ?? [],
    );
  });
});
