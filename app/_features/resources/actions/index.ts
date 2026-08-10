"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { detectResourceFromUrl } from "@/app/_lib/resources/url-detector";
import type { ResourceMode, ResourceSource, ResourceType } from "@/app/_lib/resources/types";

const AddResourceSchema = z.object({
  entityType: z.enum(["person", "org", "work", "billing", "meeting", "note", "space"]).optional(),
  entityId: z.string().uuid().optional(),
  resourceUrl: z.string().url(),
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  mode: z.enum(["static", "live"]).default("static"),
  source: z.enum(["manual", "care", "enrichment", "ask_salt", "capture"]).default("manual"),
  confidence: z.number().min(0).max(100).optional(),
  because: z.string().max(500).optional(),
});

export type AddResourceInput = z.infer<typeof AddResourceSchema>;

export async function addResource(input: AddResourceInput) {
  const parsed = AddResourceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { workspace, supabase } = await getWorkspaceContext();
  const data = parsed.data;

  const detection = detectResourceFromUrl(data.resourceUrl);
  if (!detection) {
    return { success: false, error: "Invalid URL" };
  }

  const name = data.displayName || detection.suggestedName || new URL(data.resourceUrl).hostname;

  const { data: existing } = await supabase
    .from("files")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("external_url", data.resourceUrl)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Resource already exists", existingId: existing.id };
  }

  const { data: resource, error } = await supabase
    .from("files")
    .insert({
      workspace_id: workspace.id,
      file_name: name,
      file_type: "link",
      external_url: data.resourceUrl,
      description: data.description,
      mode: data.mode,
      resource_type: detection.resourceType,
      resource_id: detection.resourceId,
      provider_metadata: detection.extractedMetadata,
      provider_metadata_at: new Date().toISOString(),
      source: data.source,
      confidence: data.confidence,
      because: data.because,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create resource:", error);
    return { success: false, error: "Failed to create resource" };
  }

  if (data.entityType && data.entityId) {
    await supabase.from("entity_links").insert({
      workspace_id: workspace.id,
      source_type: "file",
      source_id: resource.id,
      target_type: data.entityType === "space" ? "space" : data.entityType,
      target_id: data.entityId,
      relation_type: "related",
      source: data.source,
    });

    revalidatePath(`/${data.entityType === "org" ? "orgs" : data.entityType}/${data.entityId}`);
  }

  revalidatePath("/resources");

  return {
    success: true,
    resourceId: resource.id,
    detectedType: detection.resourceType,
    supportsLive: detection.supportsLive,
  };
}

const UpdateResourceModeSchema = z.object({
  resourceId: z.string().uuid(),
  mode: z.enum(["static", "live"]),
  liveConfig: z.object({
    events: z.array(z.string()).optional(),
    branch: z.string().optional(),
    notify: z.boolean().optional(),
  }).optional(),
});

export async function updateResourceMode(input: z.infer<typeof UpdateResourceModeSchema>) {
  const parsed = UpdateResourceModeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { workspace, supabase } = await getWorkspaceContext();
  const data = parsed.data;

  const { error } = await supabase
    .from("files")
    .update({
      mode: data.mode,
      live_config: data.liveConfig ?? {},
    })
    .eq("id", data.resourceId)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("Failed to update resource mode:", error);
    return { success: false, error: "Failed to update resource mode" };
  }

  return { success: true };
}

const RemoveResourceSchema = z.object({
  resourceId: z.string().uuid(),
  entityType: z.enum(["person", "org", "work", "billing", "meeting", "note", "space"]),
  entityId: z.string().uuid(),
});

export async function removeResource(input: z.infer<typeof RemoveResourceSchema>) {
  const parsed = RemoveResourceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { workspace, supabase } = await getWorkspaceContext();
  const data = parsed.data;

  await supabase
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("source_type", "file")
    .eq("source_id", data.resourceId)
    .eq("target_type", data.entityType === "space" ? "space" : data.entityType)
    .eq("target_id", data.entityId);

  const { data: remainingLinks } = await supabase
    .from("entity_links")
    .select("id")
    .or(`source_id.eq.${data.resourceId},target_id.eq.${data.resourceId}`)
    .limit(1);

  if (!remainingLinks || remainingLinks.length === 0) {
    await supabase
      .from("files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.resourceId)
      .eq("workspace_id", workspace.id);
  }

  revalidatePath(`/${data.entityType === "org" ? "orgs" : data.entityType}/${data.entityId}`);

  return { success: true };
}

export async function refreshResourceMetadata(resourceId: string) {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data: resource } = await supabase
    .from("files")
    .select("id, external_url, resource_type")
    .eq("id", resourceId)
    .eq("workspace_id", workspace.id)
    .single();

  if (!resource?.external_url) {
    return { success: false, error: "Resource not found" };
  }

  const detection = detectResourceFromUrl(resource.external_url);
  if (!detection) {
    return { success: false, error: "Could not detect resource type" };
  }

  const { extractResourceMetadata } = await import("@/app/_lib/resources/metadata");
  const richMetadata = await extractResourceMetadata(
    resource.external_url,
    detection.resourceType
  );

  const { error } = await supabase
    .from("files")
    .update({
      resource_type: detection.resourceType,
      resource_id: detection.resourceId,
      provider_metadata: {
        ...detection.extractedMetadata,
        ...richMetadata?.raw,
        title: richMetadata?.title,
        description: richMetadata?.description,
        stats: richMetadata?.stats,
      },
      provider_metadata_at: new Date().toISOString(),
    })
    .eq("id", resourceId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { success: false, error: "Failed to refresh metadata" };
  }

  return { success: true, metadata: detection.extractedMetadata };
}

export async function fetchResourcePreview(url: string) {
  const detection = detectResourceFromUrl(url);
  if (!detection) {
    return { success: false, error: "Invalid URL" };
  }

  const { extractResourceMetadata } = await import("@/app/_lib/resources/metadata");
  const metadata = await extractResourceMetadata(url, detection.resourceType);

  return {
    success: true,
    detection,
    metadata,
  };
}

export {
  searchFileLinkTargets,
  updateMemoryFileConnection,
  archiveMemoryFile,
  updateMemoryFileCategory,
  updateMemoryFileField,
  logFileViewActivity,
  fetchFileDetailData,
  type FileLinkTarget,
  type FileLinkSearchResult,
  type FileDetailData,
} from "./file-actions";
export { saveMemoryFileAction } from "./save-memory-file";
