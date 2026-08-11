import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { Resource, ResourceMode, ResourceType, ResourceSource } from "@/app/_lib/resources/types";

interface FileRow {
  id: string;
  workspace_id: string;
  file_name: string;
  file_type: "file" | "link" | null;
  external_url: string | null;
  description: string | null;
  mode: ResourceMode | null;
  resource_type: ResourceType | null;
  resource_id: string | null;
  live_config: Record<string, unknown> | null;
  last_activity_at: string | null;
  last_activity_summary: string | null;
  composio_trigger_id: string | null;
  provider_metadata: Record<string, unknown> | null;
  provider_metadata_at: string | null;
  source: ResourceSource | null;
  confidence: number | null;
  because: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  person_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapFileRowToResource(row: FileRow): Resource {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    mode: row.mode ?? "static",
    resourceType: row.resource_type ?? (row.file_type === "link" ? "url" : "file"),
    resourceUrl: row.external_url ?? undefined,
    resourceId: row.resource_id ?? undefined,
    name: row.file_name,
    description: row.description ?? undefined,
    fileCategory: row.category ?? undefined,
    fileSizeBytes: row.size_bytes ?? undefined,
    mimeType: row.mime_type ?? undefined,
    metadata: {},
    liveConfig: row.live_config as Resource["liveConfig"],
    lastActivityAt: row.last_activity_at ?? undefined,
    lastActivitySummary: row.last_activity_summary ?? undefined,
    composioTriggerId: row.composio_trigger_id ?? undefined,
    providerMetadata: row.provider_metadata ?? undefined,
    providerMetadataAt: row.provider_metadata_at ?? undefined,
    source: row.source ?? "manual",
    confidence: row.confidence ?? undefined,
    because: row.because ?? undefined,
    personId: row.person_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const getEntityResources = cache(
  async (
    entityType: "person" | "org" | "work" | "billing" | "meeting" | "note" | "space",
    entityId: string
  ): Promise<Resource[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: links } = await supabase
      .from("entity_links")
      .select("source_id")
      .eq("workspace_id", workspace.id)
      .eq("source_type", "file")
      .eq("target_type", entityType)
      .eq("target_id", entityId);

    if (!links || links.length === 0) return [];

    const fileIds = links.map((link) => link.source_id);

    const { data: files, error } = await supabase
      .from("resources")
      .select(`
        id,
        workspace_id,
        file_name,
        file_type,
        external_url,
        description,
        mode,
        resource_type,
        resource_id,
        live_config,
        last_activity_at,
        last_activity_summary,
        composio_trigger_id,
        provider_metadata,
        provider_metadata_at,
        source,
        confidence,
        because,
        mime_type,
        size_bytes,
        category,
        person_id,
        organization_id,
        created_at,
        updated_at
      `)
      .in("id", fileIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching entity resources:", error);
      return [];
    }

    return (files ?? []).map((row) => mapFileRowToResource(row as unknown as FileRow));
  }
);

export const getLiveResources = cache(async (): Promise<Resource[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: files, error } = await supabase
    .from("resources")
    .select(`
      id,
      workspace_id,
      file_name,
      file_type,
      external_url,
      description,
      mode,
      resource_type,
      resource_id,
      live_config,
      last_activity_at,
      last_activity_summary,
      composio_trigger_id,
      provider_metadata,
      provider_metadata_at,
      source,
      confidence,
      because,
      mime_type,
      size_bytes,
      category,
      person_id,
      organization_id,
      created_at,
      updated_at
    `)
    .eq("workspace_id", workspace.id)
    .eq("mode", "live")
    .is("deleted_at", null)
    .order("last_activity_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Error fetching live resources:", error);
    return [];
  }

  return (files ?? []).map((row) => mapFileRowToResource(row as unknown as FileRow));
});

export interface ResourceSignal {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  entityType: string;
  entityId: string;
  signalKey: string;
  evidence: {
    resourceUrl?: string;
    summary?: string;
    prNumber?: number;
    prTitle?: string;
    prAuthor?: string;
    branch?: string;
    action?: string;
    [key: string]: unknown;
  };
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
}

export const getResourceSignals = cache(
  async (
    resourceId: string,
    limit = 20
  ): Promise<ResourceSignal[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("resource_signals")
      .select(`
        id,
        resource_id,
        resource_type,
        entity_type,
        entity_id,
        signal_key,
        evidence,
        processed_at,
        processed_by,
        created_at
      `)
      .eq("workspace_id", workspace.id)
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching resource signals:", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      resourceId: row.resource_id,
      resourceType: row.resource_type as ResourceType,
      entityType: row.entity_type,
      entityId: row.entity_id,
      signalKey: row.signal_key,
      evidence: row.evidence as ResourceSignal["evidence"],
      processedAt: row.processed_at,
      processedBy: row.processed_by,
      createdAt: row.created_at,
    }));
  }
);

export const getEntityResourceSignals = cache(
  async (
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<ResourceSignal[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("resource_signals")
      .select(`
        id,
        resource_id,
        resource_type,
        entity_type,
        entity_id,
        signal_key,
        evidence,
        processed_at,
        processed_by,
        created_at
      `)
      .eq("workspace_id", workspace.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching entity resource signals:", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      resourceId: row.resource_id,
      resourceType: row.resource_type as ResourceType,
      entityType: row.entity_type,
      entityId: row.entity_id,
      signalKey: row.signal_key,
      evidence: row.evidence as ResourceSignal["evidence"],
      processedAt: row.processed_at,
      processedBy: row.processed_by,
      createdAt: row.created_at,
    }));
  }
);

export const getResourceById = cache(
  async (resourceId: string): Promise<Resource | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: file, error } = await supabase
      .from("resources")
      .select(`
        id,
        workspace_id,
        file_name,
        file_type,
        external_url,
        description,
        mode,
        resource_type,
        resource_id,
        live_config,
        last_activity_at,
        last_activity_summary,
        composio_trigger_id,
        provider_metadata,
        provider_metadata_at,
        source,
        confidence,
        because,
        mime_type,
        size_bytes,
        category,
        person_id,
        organization_id,
        created_at,
        updated_at
      `)
      .eq("id", resourceId)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .single();

    if (error || !file) {
      return null;
    }

    return mapFileRowToResource(file as unknown as FileRow);
  }
);
