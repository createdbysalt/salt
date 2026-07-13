/**
 * Link Entities - Create a relationship between two entities
 *
 * Protected tool that creates entity links.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export type LinkRelationType =
  | "works_at"
  | "employs"
  | "primary_contact"
  | "billing_contact"
  | "collaborator"
  | "referred_by"
  | "for_client"
  | "involves"
  | "deliverable_for"
  | "attendee"
  | "about_work"
  | "has_attachment";

export interface LinkEntitiesInput {
  workspaceId: string;
  sourceType: LearningEntityType;
  sourceId: string;
  targetType: LearningEntityType;
  targetId: string;
  relationType: LinkRelationType;
  confidence?: number;
  because?: string;
}

export interface LinkEntitiesResult {
  success: boolean;
  linkId?: string;
  error?: string;
}

export async function memoryLinkEntities(
  input: LinkEntitiesInput
): Promise<LinkEntitiesResult> {
  const {
    workspaceId,
    sourceType,
    sourceId,
    targetType,
    targetId,
    relationType,
    confidence = 100,
    because,
  } = input;
  const supabase = createAdminClient();

  if (sourceType === "person" && targetType === "organization" && relationType === "works_at") {
    const { data: existing } = await supabase
      .from("organization_people")
      .select("id")
      .eq("person_id", sourceId)
      .eq("organization_id", targetId)
      .single();

    if (!existing) {
      const { error } = await supabase.from("organization_people").insert({
        person_id: sourceId,
        organization_id: targetId,
        role: null,
        is_primary: false,
      });

      if (error) {
        return {
          success: false,
          error: `Failed to create org-person link: ${error.message}`,
        };
      }
    }

    return { success: true };
  }

  if (sourceType === "work" && targetType === "organization" && relationType === "for_client") {
    const { error } = await supabase
      .from("work")
      .update({ organization_id: targetId })
      .eq("id", sourceId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return {
        success: false,
        error: `Failed to link work to org: ${error.message}`,
      };
    }

    return { success: true };
  }

  if (sourceType === "work" && targetType === "person" && relationType === "involves") {
    const { error } = await supabase
      .from("work")
      .update({ person_id: targetId })
      .eq("id", sourceId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return {
        success: false,
        error: `Failed to link work to person: ${error.message}`,
      };
    }

    return { success: true };
  }

  const { data: existing } = await supabase
    .from("entity_links")
    .select("id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("relation_type", relationType)
    .single();

  if (existing) {
    return { success: true, linkId: existing.id };
  }

  const { data: link, error } = await supabase
    .from("entity_links")
    .insert({
      workspace_id: workspaceId,
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      relation_type: relationType,
      confidence,
      because,
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: `Failed to create link: ${error.message}`,
    };
  }

  return {
    success: true,
    linkId: link?.id,
  };
}

export interface UnlinkEntitiesInput {
  workspaceId: string;
  sourceType: LearningEntityType;
  sourceId: string;
  targetType: LearningEntityType;
  targetId: string;
  relationType?: LinkRelationType;
}

export interface UnlinkEntitiesResult {
  success: boolean;
  removedCount: number;
  error?: string;
}

export async function memoryUnlinkEntities(
  input: UnlinkEntitiesInput
): Promise<UnlinkEntitiesResult> {
  const { sourceType, sourceId, targetType, targetId, relationType } = input;
  const supabase = createAdminClient();

  if (sourceType === "person" && targetType === "organization") {
    const { error } = await supabase
      .from("organization_people")
      .delete()
      .eq("person_id", sourceId)
      .eq("organization_id", targetId);

    if (error) {
      return {
        success: false,
        removedCount: 0,
        error: `Failed to remove org-person link: ${error.message}`,
      };
    }
  }

  let query = supabase
    .from("entity_links")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (relationType) {
    query = query.eq("relation_type", relationType);
  }

  const { error, count } = await query;

  if (error) {
    return {
      success: false,
      removedCount: 0,
      error: `Failed to remove link: ${error.message}`,
    };
  }

  return {
    success: true,
    removedCount: count || 0,
  };
}
