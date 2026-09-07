/**
 * attachArtifactToEntity — the artifact-first foundation (Phase 7).
 *
 * Every artifact that matters becomes a Resource connected to its record:
 * a hosted Stripe invoice attaches to its billing record, a notes doc to
 * its meeting. This helper creates the Resource (link or already-uploaded
 * file) and the entity_links `attachment` edge together, idempotent on
 * (workspace_id, external_url | object_path, target record) so webhook
 * retries and re-syncs never duplicate the artifact.
 *
 * Background-job context: takes an admin client and an explicit workspace
 * id — no user session. System-authored rows set created_by_system and
 * leave uploaded_by null (allowed since the Phase 0 migration).
 *
 * Not a server action — server actions live in ./index.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/app/_lib/supabase/database.types";
import { detectResourceFromUrl } from "@/app/_lib/resources/url-detector";
import type {
  ResourceSource,
  ResourceType,
} from "@/app/_lib/resources/types";

export type ArtifactTargetType =
  | "person"
  | "org"
  | "work"
  | "billing"
  | "meeting"
  | "note";

export interface AttachArtifactInput {
  workspaceId: string;
  targetType: ArtifactTargetType;
  targetId: string;
  /** Link artifact: hosted invoice page, notes doc, transcript URL… */
  externalUrl?: string;
  /** File artifact: a storage object already uploaded by the caller. */
  file?: {
    bucketId: string;
    objectPath: string;
    fileName: string;
    mimeType: string;
    sizeBytes?: number;
  };
  displayName?: string;
  description?: string;
  source: ResourceSource;
  confidence?: number;
  because?: string;
  /** When the URL alone can't reveal the type (Fireflies, Otter…). */
  resourceTypeOverride?: ResourceType;
  /** file_category — defaults to the DB's 'other' when omitted. */
  category?: Database["public"]["Enums"]["file_category"];
  captureEventId?: string;
  /**
   * The acting user when a person (not a background job) produced the
   * artifact — e.g. the billing-document upload flow. Sets uploaded_by and
   * clears created_by_system.
   */
  actingUserId?: string;
}

export type AttachArtifactResult =
  | {
      success: true;
      resourceId: string;
      createdResource: boolean;
      createdEdge: boolean;
    }
  | { success: false; error: string };

// entity_links.source has a narrower vocabulary than resources.source —
// CHECK (source IN ('manual','care','system')) since
// 20260807080000_retire_keeper_vocabulary.sql. Map the wider ResourceSource
// onto it: capture is automatic sync, enrichment is a care-layer write, and
// ask_salt is user-initiated.
const LINK_SOURCE: Record<ResourceSource, "manual" | "care" | "system"> = {
  manual: "manual",
  care: "care",
  enrichment: "care",
  ask_salt: "manual",
  capture: "system",
};

export async function attachArtifactToEntity(
  supabase: SupabaseClient<Database>,
  input: AttachArtifactInput,
): Promise<AttachArtifactResult> {
  if (!input.externalUrl && !input.file) {
    return { success: false, error: "An artifact needs a URL or a file" };
  }
  if (input.externalUrl && input.file) {
    return { success: false, error: "An artifact is a URL or a file, not both" };
  }

  // 1. Find or create the Resource — dedupe on the artifact's identity.
  let resourceId: string | null = null;

  if (input.externalUrl) {
    const { data: existing } = await supabase
      .from("resources")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("external_url", input.externalUrl)
      .is("deleted_at", null)
      .maybeSingle();
    resourceId = existing?.id ?? null;
  } else if (input.file) {
    const { data: existing } = await supabase
      .from("resources")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("object_path", input.file.objectPath)
      .is("deleted_at", null)
      .maybeSingle();
    resourceId = existing?.id ?? null;
  }

  let createdResource = false;

  if (!resourceId) {
    const detection = input.externalUrl
      ? detectResourceFromUrl(input.externalUrl)
      : null;

    const name =
      input.displayName ??
      detection?.suggestedName ??
      input.file?.fileName ??
      (input.externalUrl ? new URL(input.externalUrl).hostname : "Artifact");

    const { data: resource, error } = await supabase
      .from("resources")
      .insert({
        workspace_id: input.workspaceId,
        file_name: name,
        file_type: input.file ? input.file.mimeType : "link",
        external_url: input.externalUrl ?? null,
        bucket_id: input.file?.bucketId,
        object_path: input.file?.objectPath,
        mime_type: input.file?.mimeType,
        size_bytes: input.file?.sizeBytes,
        description: input.description,
        category: input.category,
        mode: "static",
        resource_type: input.resourceTypeOverride ?? detection?.resourceType,
        resource_id: detection?.resourceId,
        provider_metadata: detection?.extractedMetadata as Json | undefined,
        provider_metadata_at: detection ? new Date().toISOString() : undefined,
        source: input.source,
        confidence: input.confidence,
        because: input.because,
        capture_event_id: input.captureEventId,
        created_by_system: !input.actingUserId,
        uploaded_by: input.actingUserId ?? null,
      })
      .select("id")
      .single();

    if (error || !resource) {
      console.error("attachArtifactToEntity: resource insert failed:", error);
      return { success: false, error: "Failed to create the artifact" };
    }
    resourceId = resource.id;
    createdResource = true;
  }

  // 2. Find or create the attachment edge — any existing edge between this
  // resource and target satisfies idempotency, whatever its relation.
  const { data: existingEdge } = await supabase
    .from("entity_links")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("source_type", "resource")
    .eq("source_id", resourceId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .maybeSingle();

  let createdEdge = false;

  if (!existingEdge) {
    const { error: edgeError } = await supabase.from("entity_links").insert({
      workspace_id: input.workspaceId,
      source_type: "resource",
      source_id: resourceId,
      target_type: input.targetType,
      target_id: input.targetId,
      relation_type: "attachment",
      source: LINK_SOURCE[input.source],
      confidence: input.confidence,
      because: input.because,
    });

    if (edgeError) {
      console.error("attachArtifactToEntity: edge insert failed:", edgeError);
      return { success: false, error: "Failed to attach the artifact" };
    }
    createdEdge = true;
  }

  return { success: true, resourceId, createdResource, createdEdge };
}
