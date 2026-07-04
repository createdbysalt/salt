"use server";

/**
 * Tag Service
 *
 * CRUD operations for workspace tags and entity assignments.
 * Includes guardrails for AI tag creation:
 * - Cap on AI-created tags per scope
 * - Fuzzy merge detection
 * - Auto-archive for unused tags
 */

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { normalizeTagSlug, normalizeTagLabel, slugToLabel } from "./normalize";
import { checkForDuplicate, type ExistingTag } from "./dedupe";
import type { VocabularyScope } from "../taxonomy/registry";
import { fromUnitInterval } from "@/app/_features/memory/lib/confidence";

// ============================================================================
// TYPES
// ============================================================================

export type TagScope = "person" | "org" | "work" | "billing" | "file" | "all";
export type TagCategory = "segment" | "signal" | "priority" | "custom";
export type TagSource = "manual" | "keeper" | "system";

export interface WorkspaceTag {
  id: string;
  workspaceId: string;
  slug: string;
  label: string;
  scope: TagScope;
  category: TagCategory;
  color: string | null;
  aiDescription: string | null;
  isSystem: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagAssignment {
  id: string;
  workspaceId: string;
  entityType: "person" | "org" | "work" | "billing" | "file";
  entityId: string;
  tagId: string;
  tag?: WorkspaceTag;
  source: TagSource;
  confidence: number | null;
  because: string | null;
  sourceRef: string | null;
  createdAt: string;
}

export interface CreateTagResult {
  success: boolean;
  tag?: WorkspaceTag;
  action?: "created" | "reused" | "unarchived" | "proposed";
  reason?: string;
  error?: string;
}

export interface AssignTagResult {
  success: boolean;
  assignment?: TagAssignment;
  action?: "assigned" | "already_assigned" | "proposed";
  reason?: string;
  error?: string;
}

// ============================================================================
// TAG QUERIES
// ============================================================================

export async function getTags(options?: {
  scope?: TagScope;
  category?: TagCategory;
  includeArchived?: boolean;
}): Promise<{ success: boolean; data: WorkspaceTag[]; error?: string }> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single();

  if (!member) {
    return { success: false, data: [], error: "No workspace found" };
  }

  let query = supabase
    .from("workspace_tags")
    .select("*")
    .eq("workspace_id", member.workspace_id)
    .order("sort_order");

  if (!options?.includeArchived) {
    query = query.eq("is_archived", false);
  }

  if (options?.scope) {
    // For billing and file, only show scope-specific tags (not "all")
    // For other scopes, include "all" scoped tags as well
    if (options.scope === "billing" || options.scope === "file") {
      query = query.eq("scope", options.scope);
    } else {
      query = query.or(`scope.eq.${options.scope},scope.eq.all`);
    }
  }

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTags error:", error);
    return { success: false, data: [], error: "Failed to fetch tags" };
  }

  return {
    success: true,
    data: (data ?? []).map(mapTagRow),
  };
}

export async function getTagById(tagId: string): Promise<WorkspaceTag | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_tags")
    .select("*")
    .eq("id", tagId)
    .single();

  if (error || !data) return null;
  return mapTagRow(data);
}

// ============================================================================
// TAG MUTATIONS
// ============================================================================

export async function createTag(input: {
  label: string;
  scope?: TagScope;
  category?: TagCategory;
  color?: string;
  aiDescription?: string;
}): Promise<CreateTagResult> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single();

  if (!member) {
    return { success: false, error: "No workspace found" };
  }

  const slug = normalizeTagSlug(input.label);
  const label = normalizeTagLabel(input.label);

  if (!slug) {
    return { success: false, error: "Invalid tag name" };
  }

  const { data: existingTags } = await supabase
    .from("workspace_tags")
    .select("id, slug, label, is_archived")
    .eq("workspace_id", member.workspace_id);

  const existing: ExistingTag[] = (existingTags ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    label: t.label,
    isArchived: t.is_archived,
  }));

  const dedupeResult = checkForDuplicate(slug, existing);

  if (dedupeResult.action === "reuse" && dedupeResult.existingTag) {
    const tag = await getTagById(dedupeResult.existingTag.id);
    return {
      success: true,
      tag: tag ?? undefined,
      action: "reused",
      reason: dedupeResult.reason,
    };
  }

  if (dedupeResult.action === "unarchive" && dedupeResult.existingTag) {
    const { error } = await supabase
      .from("workspace_tags")
      .update({ is_archived: false })
      .eq("id", dedupeResult.existingTag.id);

    if (error) {
      return { success: false, error: "Failed to unarchive tag" };
    }

    const tag = await getTagById(dedupeResult.existingTag.id);
    return {
      success: true,
      tag: tag ?? undefined,
      action: "unarchived",
      reason: dedupeResult.reason,
    };
  }

  const { data, error } = await supabase
    .from("workspace_tags")
    .insert({
      workspace_id: member.workspace_id,
      slug,
      label,
      scope: input.scope ?? "all",
      category: input.category ?? "custom",
      color: input.color ?? null,
      ai_description: input.aiDescription ?? null,
      is_system: false,
      is_archived: false,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Tag already exists" };
    }
    console.error("createTag error:", error);
    return { success: false, error: "Failed to create tag" };
  }

  return {
    success: true,
    tag: mapTagRow(data),
    action: "created",
  };
}

export async function createTagFromAI(input: {
  label: string;
  scope: TagScope;
  aiDescription: string;
  confidence: number;
}): Promise<CreateTagResult> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single();

  if (!member) {
    return { success: false, error: "No workspace found" };
  }

  const { data: settings } = await supabase
    .from("profile_playbook_settings")
    .select("tag_auto_create_threshold, tag_max_ai_created")
    .eq("workspace_id", member.workspace_id)
    .single();

  const threshold = settings?.tag_auto_create_threshold ?? 0.8;
  const maxAiCreated = settings?.tag_max_ai_created ?? 40;

  if (input.confidence < threshold) {
    return {
      success: true,
      action: "proposed",
      reason: `Confidence ${fromUnitInterval(input.confidence)}% below threshold ${fromUnitInterval(threshold)}%`,
    };
  }

  const { count } = await supabase
    .from("workspace_tags")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", member.workspace_id)
    .eq("is_system", false)
    .eq("is_archived", false)
    .or(`scope.eq.${input.scope},scope.eq.all`);

  if ((count ?? 0) >= maxAiCreated) {
    return {
      success: true,
      action: "proposed",
      reason: `Tag cap reached (${count}/${maxAiCreated} for scope "${input.scope}")`,
    };
  }

  return createTag({
    label: input.label,
    scope: input.scope,
    category: "custom",
    aiDescription: input.aiDescription,
  });
}

export async function updateTag(
  tagId: string,
  input: {
    label?: string;
    color?: string;
    aiDescription?: string;
    sortOrder?: number;
  }
): Promise<{ success: boolean; tag?: WorkspaceTag; error?: string }> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};

  if (input.label !== undefined) {
    updates.label = normalizeTagLabel(input.label);
  }
  if (input.color !== undefined) updates.color = input.color;
  if (input.aiDescription !== undefined) updates.ai_description = input.aiDescription;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("workspace_tags")
    .update(updates)
    .eq("id", tagId)
    .select()
    .single();

  if (error) {
    console.error("updateTag error:", error);
    return { success: false, error: "Failed to update tag" };
  }

  return { success: true, tag: mapTagRow(data) };
}

export async function archiveTag(tagId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workspace_tags")
    .update({ is_archived: true })
    .eq("id", tagId)
    .eq("is_system", false);

  if (error) {
    console.error("archiveTag error:", error);
    return { success: false, error: "Failed to archive tag" };
  }

  return { success: true };
}

export async function unarchiveTag(tagId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workspace_tags")
    .update({ is_archived: false })
    .eq("id", tagId);

  if (error) {
    console.error("unarchiveTag error:", error);
    return { success: false, error: "Failed to unarchive tag" };
  }

  return { success: true };
}

export async function mergeTags(
  sourceTagId: string,
  targetTagId: string
): Promise<{ success: boolean; migratedCount: number; error?: string }> {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("entity_tag_assignments")
    .select("id, entity_type, entity_id")
    .eq("tag_id", sourceTagId);

  if (!assignments || assignments.length === 0) {
    await archiveTag(sourceTagId);
    return { success: true, migratedCount: 0 };
  }

  let migratedCount = 0;
  for (const assignment of assignments) {
    const { data: existing } = await supabase
      .from("entity_tag_assignments")
      .select("id")
      .eq("tag_id", targetTagId)
      .eq("entity_type", assignment.entity_type)
      .eq("entity_id", assignment.entity_id)
      .single();

    if (!existing) {
      await supabase
        .from("entity_tag_assignments")
        .update({ tag_id: targetTagId })
        .eq("id", assignment.id);
      migratedCount++;
    } else {
      await supabase.from("entity_tag_assignments").delete().eq("id", assignment.id);
    }
  }

  await archiveTag(sourceTagId);

  return { success: true, migratedCount };
}

// ============================================================================
// TAG ASSIGNMENT OPERATIONS
// ============================================================================

export async function getEntityTags(
  entityType: "person" | "org" | "work" | "billing" | "file",
  entityId: string
): Promise<{ success: boolean; data: TagAssignment[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entity_tag_assignments")
    .select(`
      *,
      tag:workspace_tags(*)
    `)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    console.error("getEntityTags error:", error);
    return { success: false, data: [], error: "Failed to fetch tags" };
  }

  return {
    success: true,
    data: (data ?? []).map(mapAssignmentRow),
  };
}

export async function assignTag(input: {
  entityType: "person" | "org" | "work" | "billing" | "file";
  entityId: string;
  tagId: string;
  source?: TagSource;
  confidence?: number;
  because?: string;
  sourceRef?: string;
}): Promise<AssignTagResult> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single();

  if (!member) {
    return { success: false, error: "No workspace found" };
  }

  const { data: existing } = await supabase
    .from("entity_tag_assignments")
    .select("id")
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("tag_id", input.tagId)
    .single();

  if (existing) {
    return {
      success: true,
      action: "already_assigned",
      reason: "Tag already assigned to this entity",
    };
  }

  const { data, error } = await supabase
    .from("entity_tag_assignments")
    .insert({
      workspace_id: member.workspace_id,
      entity_type: input.entityType,
      entity_id: input.entityId,
      tag_id: input.tagId,
      source: input.source ?? "manual",
      confidence: input.confidence ?? null,
      because: input.because ?? null,
      source_ref: input.sourceRef ?? null,
    })
    .select(`
      *,
      tag:workspace_tags(*)
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: true, action: "already_assigned" };
    }
    console.error("assignTag error:", error);
    return { success: false, error: "Failed to assign tag" };
  }

  return {
    success: true,
    assignment: mapAssignmentRow(data),
    action: "assigned",
  };
}

export async function unassignTag(
  entityType: "person" | "org" | "work" | "billing" | "file",
  entityId: string,
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("entity_tag_assignments")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("tag_id", tagId);

  if (error) {
    console.error("unassignTag error:", error);
    return { success: false, error: "Failed to remove tag" };
  }

  return { success: true };
}

// ============================================================================
// AUTO-ARCHIVE (Run periodically to clean up unused tags)
// ============================================================================

export async function archiveUnusedTags(daysUnused: number = 90): Promise<{
  success: boolean;
  archivedCount: number;
  error?: string;
}> {
  const admin = createAdminClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysUnused);

  const { data: unusedTags, error: fetchError } = await admin
    .from("workspace_tags")
    .select(`
      id,
      created_at,
      entity_tag_assignments(id)
    `)
    .eq("is_system", false)
    .eq("is_archived", false)
    .lt("created_at", cutoffDate.toISOString());

  if (fetchError) {
    console.error("archiveUnusedTags fetch error:", fetchError);
    return { success: false, archivedCount: 0, error: "Failed to fetch tags" };
  }

  const tagsToArchive = (unusedTags ?? []).filter(
    (t: { id: string; created_at: string; entity_tag_assignments: { id: string }[] | null }) =>
      !t.entity_tag_assignments || t.entity_tag_assignments.length === 0
  );

  if (tagsToArchive.length === 0) {
    return { success: true, archivedCount: 0 };
  }

  const { error: updateError } = await admin
    .from("workspace_tags")
    .update({ is_archived: true })
    .in(
      "id",
      tagsToArchive.map((t: { id: string }) => t.id)
    );

  if (updateError) {
    console.error("archiveUnusedTags update error:", updateError);
    return { success: false, archivedCount: 0, error: "Failed to archive tags" };
  }

  return { success: true, archivedCount: tagsToArchive.length };
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapTagRow(row: Record<string, unknown>): WorkspaceTag {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    slug: row.slug as string,
    label: row.label as string,
    scope: row.scope as TagScope,
    category: row.category as TagCategory,
    color: (row.color as string | null) ?? null,
    aiDescription: (row.ai_description as string | null) ?? null,
    isSystem: row.is_system as boolean,
    isArchived: row.is_archived as boolean,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapAssignmentRow(row: Record<string, unknown>): TagAssignment {
  const tagData = row.tag as Record<string, unknown> | null;
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    entityType: row.entity_type as "person" | "org" | "work" | "billing",
    entityId: row.entity_id as string,
    tagId: row.tag_id as string,
    tag: tagData ? mapTagRow(tagData) : undefined,
    source: row.source as TagSource,
    confidence: (row.confidence as number | null) ?? null,
    because: (row.because as string | null) ?? null,
    sourceRef: (row.source_ref as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
