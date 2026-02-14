/**
 * Knowledge Feature - Server Actions
 *
 * Mutations for the client knowledge base feature.
 *
 * Usage:
 *   import { addKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem } from '@/app/_features/knowledge/actions'
 */

"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  KnowledgeItem,
  KnowledgeType,
  KnowledgeCategory,
  CreateKnowledgeItemInput,
  UpdateKnowledgeItemInput,
} from "./types";

/**
 * Standard action response type
 */
export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Valid knowledge types matching the database CHECK constraint
 */
const knowledgeTypes: KnowledgeType[] = [
  "intake_response",
  "discovery_note",
  "meeting_transcript",
  "document",
  "link",
  "insight",
  "decision",
  "feedback",
  "asset",
];

/**
 * Valid categories
 */
const knowledgeCategories: KnowledgeCategory[] = [
  "brand",
  "technical",
  "business",
  "design",
];

/**
 * Schema for creating a knowledge item
 */
const createKnowledgeItemSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  project_id: z.string().uuid("Invalid project ID").nullish(), // null = client-level
  type: z.enum(knowledgeTypes as [KnowledgeType, ...KnowledgeType[]], {
    errorMap: () => ({ message: "Invalid knowledge type" }),
  }),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  content: z.string().optional(),
  rich_content: z.record(z.unknown()).optional(),
  source_intake_id: z.string().uuid().optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  source_file_path: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  category: z
    .enum(knowledgeCategories as [KnowledgeCategory, ...KnowledgeCategory[]])
    .optional(),
  is_pinned: z.boolean().optional(),
  is_private: z.boolean().optional(),
});

/**
 * Schema for updating a knowledge item
 */
const updateKnowledgeItemSchema = z.object({
  project_id: z.string().uuid("Invalid project ID").nullish(), // null = client-level
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  rich_content: z.record(z.unknown()).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  source_file_path: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  category: z
    .enum(knowledgeCategories as [KnowledgeCategory, ...KnowledgeCategory[]])
    .optional()
    .nullable(),
  is_pinned: z.boolean().optional(),
  is_private: z.boolean().optional(),
});

/**
 * Add a new knowledge item for a client
 */
export async function addKnowledgeItem(
  input: CreateKnowledgeItemInput
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase, userId } = await getStudioContext();

    // Validate input
    const validatedData = createKnowledgeItemSchema.parse(input);

    // Verify client belongs to this studio
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", validatedData.client_id)
      .eq("studio_id", studio.id)
      .single();

    if (clientError || !client) {
      return { success: false, error: "Client not found" };
    }

    // Verify project belongs to this client (if provided)
    if (validatedData.project_id) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", validatedData.project_id)
        .eq("client_id", validatedData.client_id)
        .eq("studio_id", studio.id)
        .single();

      if (projectError || !project) {
        return { success: false, error: "Project not found or doesn't belong to this client" };
      }
    }

    // Prepare insert data
    const insertData = {
      studio_id: studio.id,
      client_id: validatedData.client_id,
      project_id: validatedData.project_id || null,
      type: validatedData.type,
      title: validatedData.title,
      content: validatedData.content || null,
      rich_content: validatedData.rich_content || null,
      source_intake_id: validatedData.source_intake_id || null,
      source_url: validatedData.source_url || null,
      source_file_path: validatedData.source_file_path || null,
      tags: validatedData.tags || [],
      category: validatedData.category || null,
      is_pinned: validatedData.is_pinned ?? false,
      is_private: validatedData.is_private ?? false,
      created_by: userId,
    };

    // Insert the knowledge item
    const { data: newItem, error: insertError } = await supabase
      .from("knowledge_items")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating knowledge item:", insertError);
      return { success: false, error: "Failed to create knowledge item" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/studio/clients/${validatedData.client_id}/knowledge`);

    return { success: true, data: newItem as KnowledgeItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in addKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing knowledge item
 */
export async function updateKnowledgeItem(
  id: string,
  input: UpdateKnowledgeItemInput
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Validate input
    const validatedData = updateKnowledgeItemSchema.parse(input);

    // Verify item belongs to this studio
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Verify project belongs to this client (if changing project_id)
    if (validatedData.project_id !== undefined && validatedData.project_id !== null) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", validatedData.project_id)
        .eq("client_id", existingItem.client_id)
        .eq("studio_id", studio.id)
        .single();

      if (projectError || !project) {
        return { success: false, error: "Project not found or doesn't belong to this client" };
      }
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (validatedData.project_id !== undefined) updateData.project_id = validatedData.project_id;
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.content !== undefined) updateData.content = validatedData.content;
    if (validatedData.rich_content !== undefined) updateData.rich_content = validatedData.rich_content;
    if (validatedData.source_url !== undefined) updateData.source_url = validatedData.source_url || null;
    if (validatedData.source_file_path !== undefined) updateData.source_file_path = validatedData.source_file_path;
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;
    if (validatedData.is_pinned !== undefined) updateData.is_pinned = validatedData.is_pinned;
    if (validatedData.is_private !== undefined) updateData.is_private = validatedData.is_private;

    // Update the knowledge item
    const { data: updatedItem, error: updateError } = await supabase
      .from("knowledge_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating knowledge item:", updateError);
      return { success: false, error: "Failed to update knowledge item" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/studio/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: updatedItem as KnowledgeItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in updateKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a knowledge item
 */
export async function deleteKnowledgeItem(
  id: string
): Promise<ActionResponse<void>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Verify item belongs to this studio and get client_id for revalidation
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Delete the knowledge item (hard delete)
    const { error: deleteError } = await supabase
      .from("knowledge_items")
      .delete()
      .eq("id", id)
      .eq("studio_id", studio.id);

    if (deleteError) {
      console.error("Error deleting knowledge item:", deleteError);
      return { success: false, error: "Failed to delete knowledge item" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/studio/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in deleteKnowledgeItem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle pin status of a knowledge item
 */
export async function toggleKnowledgeItemPin(
  id: string
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Get current pin state
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id, is_pinned")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Toggle pin state
    const { data: updatedItem, error: updateError } = await supabase
      .from("knowledge_items")
      .update({ is_pinned: !existingItem.is_pinned })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error toggling pin:", updateError);
      return { success: false, error: "Failed to toggle pin status" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/studio/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: updatedItem as KnowledgeItem };
  } catch (error) {
    console.error("Error in toggleKnowledgeItemPin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Toggle privacy status of a knowledge item
 */
export async function toggleKnowledgeItemPrivacy(
  id: string
): Promise<ActionResponse<KnowledgeItem>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate ID
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid knowledge item ID" };
    }

    // Get current privacy state
    const { data: existingItem, error: fetchError } = await supabase
      .from("knowledge_items")
      .select("id, client_id, is_private")
      .eq("id", id)
      .eq("studio_id", studio.id)
      .single();

    if (fetchError || !existingItem) {
      return { success: false, error: "Knowledge item not found" };
    }

    // Toggle privacy state
    const { data: updatedItem, error: updateError } = await supabase
      .from("knowledge_items")
      .update({ is_private: !existingItem.is_private })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error toggling privacy:", updateError);
      return { success: false, error: "Failed to toggle privacy status" };
    }

    // Revalidate client knowledge page
    revalidatePath(`/studio/clients/${existingItem.client_id}/knowledge`);

    return { success: true, data: updatedItem as KnowledgeItem };
  } catch (error) {
    console.error("Error in toggleKnowledgeItemPrivacy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search knowledge items for a specific client
 * Used by the KnowledgeMentionPicker component
 */
export async function searchKnowledgeForClient(
  clientId: string,
  searchTerm: string,
  limit: number = 10
): Promise<ActionResponse<KnowledgeItem[]>> {
  try {
    const { studio, supabase } = await getStudioContext();

    // Validate inputs
    const validClientId = z.string().uuid().safeParse(clientId);
    if (!validClientId.success) {
      return { success: false, error: "Invalid client ID" };
    }

    if (!searchTerm.trim()) {
      return { success: true, data: [] };
    }

    const searchPattern = `%${searchTerm.trim()}%`;

    const { data, error } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("studio_id", studio.id)
      .eq("client_id", clientId)
      .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error searching knowledge items:", error);
      return { success: false, error: "Failed to search knowledge items" };
    }

    return { success: true, data: (data || []) as KnowledgeItem[] };
  } catch (error) {
    console.error("Error in searchKnowledgeForClient:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// INTAKE TO KNOWLEDGE CONVERSION
// =============================================================================

/**
 * Essential question metadata for knowledge item creation
 */
const ESSENTIAL_QUESTIONS = [
  {
    key: "trigger_response" as const,
    title: "What triggered this project?",
    category: "business" as KnowledgeCategory,
    tags: ["intake", "trigger", "motivation"],
  },
  {
    key: "desired_future_response" as const,
    title: "Desired future state",
    category: "business" as KnowledgeCategory,
    tags: ["intake", "goals", "vision"],
  },
  {
    key: "obstacles_response" as const,
    title: "Current obstacles",
    category: "business" as KnowledgeCategory,
    tags: ["intake", "challenges", "blockers"],
  },
  {
    key: "decision_process_response" as const,
    title: "Decision process",
    category: "business" as KnowledgeCategory,
    tags: ["intake", "stakeholders", "process"],
  },
  {
    key: "anti_goal_response" as const,
    title: "What to avoid",
    category: "business" as KnowledgeCategory,
    tags: ["intake", "constraints", "anti-goals"],
  },
];

/**
 * Input schema for intake to knowledge conversion
 */
const intakeToKnowledgeSchema = z.object({
  intake_id: z.string().uuid("Invalid intake ID"),
  client_id: z.string().uuid("Invalid client ID"),
});

export type IntakeToKnowledgeInput = z.infer<typeof intakeToKnowledgeSchema>;

/**
 * Convert intake submission responses into knowledge base items
 *
 * Creates up to 7 knowledge items:
 * - 5 intake_response items (one per essential question)
 * - 1 discovery_note item (from auto_discovery data)
 * - 1 insight item (from brand_snapshot)
 *
 * All items are linked via source_intake_id for traceability.
 */
export async function intakeToKnowledge(
  input: IntakeToKnowledgeInput
): Promise<ActionResponse<{ created: number; items: KnowledgeItem[] }>> {
  try {
    const { studio, supabase, userId } = await getStudioContext();

    // Validate input
    const validatedData = intakeToKnowledgeSchema.parse(input);

    // Verify client belongs to this studio
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", validatedData.client_id)
      .eq("studio_id", studio.id)
      .single();

    if (clientError || !client) {
      return { success: false, error: "Client not found" };
    }

    // Fetch the intake submission
    const { data: intake, error: intakeError } = await supabase
      .from("client_intakes")
      .select("*")
      .eq("id", validatedData.intake_id)
      .eq("studio_id", studio.id)
      .single();

    if (intakeError || !intake) {
      return { success: false, error: "Intake submission not found" };
    }

    const createdItems: KnowledgeItem[] = [];

    // Create knowledge items for each essential question with a response
    for (const question of ESSENTIAL_QUESTIONS) {
      const response = intake[question.key] as string | null;
      if (response && response.trim()) {
        const { data: item, error } = await supabase
          .from("knowledge_items")
          .insert({
            studio_id: studio.id,
            client_id: validatedData.client_id,
            type: "intake_response",
            title: question.title,
            content: response,
            source_intake_id: validatedData.intake_id,
            tags: question.tags,
            category: question.category,
            is_pinned: false,
            is_private: false,
            created_by: userId,
          })
          .select()
          .single();

        if (!error && item) {
          createdItems.push(item as KnowledgeItem);
        }
      }
    }

    // Create discovery_note from auto_discovery if present
    const autoDiscovery = intake.auto_discovery as Record<string, unknown> | null;
    if (autoDiscovery && Object.keys(autoDiscovery).length > 0) {
      const companyName = autoDiscovery.company_name as string || client.name;
      const discoveryContent = formatDiscoveryContent(autoDiscovery);

      const { data: discoveryItem, error: discoveryError } = await supabase
        .from("knowledge_items")
        .insert({
          studio_id: studio.id,
          client_id: validatedData.client_id,
          type: "discovery_note",
          title: `Discovery: ${companyName}`,
          content: discoveryContent,
          rich_content: autoDiscovery,
          source_intake_id: validatedData.intake_id,
          tags: ["intake", "discovery", "auto-generated"],
          category: "business",
          is_pinned: true,
          is_private: false,
          created_by: userId,
        })
        .select()
        .single();

      if (!discoveryError && discoveryItem) {
        createdItems.push(discoveryItem as KnowledgeItem);
      }
    }

    // Create insight from brand_snapshot if present
    const brandSnapshot = intake.brand_snapshot as Record<string, unknown> | null;
    if (brandSnapshot && Object.keys(brandSnapshot).length > 0) {
      const insightContent = formatBrandSnapshotContent(brandSnapshot);

      const { data: insightItem, error: insightError } = await supabase
        .from("knowledge_items")
        .insert({
          studio_id: studio.id,
          client_id: validatedData.client_id,
          type: "insight",
          title: "Brand Snapshot",
          content: insightContent,
          rich_content: brandSnapshot,
          source_intake_id: validatedData.intake_id,
          tags: ["intake", "brand", "snapshot", "auto-generated"],
          category: "brand",
          is_pinned: true,
          is_private: false,
          created_by: userId,
        })
        .select()
        .single();

      if (!insightError && insightItem) {
        createdItems.push(insightItem as KnowledgeItem);
      }
    }

    // Revalidate client knowledge page
    revalidatePath(`/studio/clients/${validatedData.client_id}/knowledge`);

    return {
      success: true,
      data: { created: createdItems.length, items: createdItems },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error in intakeToKnowledge:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Format auto_discovery data into human-readable markdown content
 */
function formatDiscoveryContent(discovery: Record<string, unknown>): string {
  const sections: string[] = [];

  if (discovery.company_name) {
    sections.push(`**Company:** ${discovery.company_name}`);
  }
  if (discovery.industry) {
    sections.push(`**Industry:** ${discovery.industry}`);
  }
  if (discovery.tech_stack && Array.isArray(discovery.tech_stack)) {
    sections.push(`**Tech Stack:** ${(discovery.tech_stack as string[]).join(", ")}`);
  }
  if (discovery.estimated_traffic) {
    const traffic = discovery.estimated_traffic as { monthly: number; source: string };
    sections.push(`**Estimated Traffic:** ${traffic.monthly.toLocaleString()}/month (${traffic.source})`);
  }
  if (discovery.team_size_estimate) {
    sections.push(`**Team Size:** ~${discovery.team_size_estimate}`);
  }
  if (discovery.funding_status) {
    sections.push(`**Funding:** ${discovery.funding_status}`);
  }
  if (discovery.content_tone) {
    sections.push(`**Content Tone:** ${discovery.content_tone}`);
  }
  if (discovery.competitors && Array.isArray(discovery.competitors)) {
    sections.push(`**Competitors:** ${(discovery.competitors as string[]).join(", ")}`);
  }
  if (discovery.visual_identity) {
    const visual = discovery.visual_identity as Record<string, unknown>;
    const visualParts: string[] = [];
    if (visual.primary_colors && Array.isArray(visual.primary_colors)) {
      visualParts.push(`Colors: ${(visual.primary_colors as string[]).join(", ")}`);
    }
    if (visual.fonts && Array.isArray(visual.fonts)) {
      visualParts.push(`Fonts: ${(visual.fonts as string[]).join(", ")}`);
    }
    if (visualParts.length > 0) {
      sections.push(`**Visual Identity:** ${visualParts.join(" | ")}`);
    }
  }
  if (discovery.social_links && Array.isArray(discovery.social_links)) {
    const links = discovery.social_links as Array<{ platform: string; url: string }>;
    const linkText = links.map(l => `[${l.platform}](${l.url})`).join(", ");
    sections.push(`**Social:** ${linkText}`);
  }

  return sections.join("\n\n") || "No discovery data available.";
}

/**
 * Format brand_snapshot data into human-readable markdown content
 */
function formatBrandSnapshotContent(snapshot: Record<string, unknown>): string {
  const sections: string[] = [];

  if (snapshot.company_name) {
    sections.push(`**Company:** ${snapshot.company_name}`);
  }
  if (snapshot.industry) {
    sections.push(`**Industry:** ${snapshot.industry}`);
  }
  if (snapshot.primary_colors && Array.isArray(snapshot.primary_colors)) {
    sections.push(`**Brand Colors:** ${(snapshot.primary_colors as string[]).join(", ")}`);
  }
  if (snapshot.key_insights && Array.isArray(snapshot.key_insights)) {
    const insights = snapshot.key_insights as string[];
    sections.push(`**Key Insights:**\n${insights.map(i => `- ${i}`).join("\n")}`);
  }
  if (snapshot.recommended_next_steps && Array.isArray(snapshot.recommended_next_steps)) {
    const steps = snapshot.recommended_next_steps as string[];
    sections.push(`**Recommended Next Steps:**\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  }
  if (snapshot.social_links && Array.isArray(snapshot.social_links)) {
    const links = snapshot.social_links as Array<{ platform: string; url: string }>;
    const linkText = links.map(l => `[${l.platform}](${l.url})`).join(", ");
    sections.push(`**Social Presence:** ${linkText}`);
  }

  return sections.join("\n\n") || "No brand snapshot available.";
}
