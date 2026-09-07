"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import {
  formatAddressSummary,
  legalAddressFromRow,
  type MemoryAddressField,
} from "@/app/_features/memory/utils/address-fields";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import type { WorkspaceProfileFieldKey } from "@/app/_features/plays/playbooks/records-engine/types";

// Legacy blueprint slug stored on existing rows — do not rename without a
// data migration.
const ME_BLUEPRINT_SLUG = "keeper-me";

function provenanceValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Provenance parity (keeper-field-contracts 6.5): one applied row per changed field. */
async function writeWorkspaceFieldProvenance(input: {
  workspaceId: string;
  field: WorkspaceProfileFieldKey;
  value: string | null;
}): Promise<void> {
  await writeProfileFieldProvenance({
    workspaceId: input.workspaceId,
    entityType: "workspace",
    entityId: input.workspaceId,
    field: input.field,
    value: input.value,
    source: "manual",
    ruleId: null,
    confidence: 100,
    evidence: { because: "You updated this field" },
    blueprintSlug: ME_BLUEPRINT_SLUG,
    blueprintVersion: 1,
    status: "applied",
  });
}

const WORKSPACE_PROFILE_PROVENANCE_FIELDS: readonly WorkspaceProfileFieldKey[] = [
  "name",
  "slug",
  "tagline",
  "description",
  "website_url",
  "location",
  "industry",
  "team_size",
  "founded_year",
  "social_links",
  "legal_business_name",
  "business_type",
  "legal_address",
  "business_phone",
  "business_email",
  "tax_id_type",
  "tax_id_last4",
  "default_currency",
  "payment_terms",
];

// ============================================================================
// STUDIO PROFILE ACTIONS
// ============================================================================

const UpdateWorkspaceProfileSchema = z.object({
  // Brand
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  tagline: z.string().max(140).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  website_url: z.string().url().or(z.literal("")).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  team_size: z.enum(["solo", "2-5", "6-10", "11-25", "25+"]).optional().nullable(),
  founded_year: z.coerce.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  social_links: z
    .object({
      x: z.string().optional().nullable(),
      twitter: z.string().optional().nullable(),
      linkedin: z.string().optional().nullable(),
      instagram: z.string().optional().nullable(),
      youtube: z.string().optional().nullable(),
      behance: z.string().optional().nullable(),
      dribbble: z.string().optional().nullable(),
      tiktok: z.string().optional().nullable(),
      vimeo: z.string().optional().nullable(),
      github: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  // Legal
  legal_business_name: z.string().max(200).optional().nullable(),
  business_type: z.enum(["sole_proprietor", "llc", "corporation", "partnership", "nonprofit"]).optional().nullable(),
  legal_address: z.string().max(500).optional().nullable(),
  // Contact
  business_phone: z.string().max(30).optional().nullable(),
  business_email: z.string().email().or(z.literal("")).optional().nullable(),
  // Tax & Billing
  tax_id_type: z.string().max(20).optional().nullable(),
  tax_id_last4: z.string().max(4).optional().nullable(),
  default_currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).optional(),
  payment_terms: z.enum(["due_on_receipt", "net_15", "net_30", "net_45", "net_60"]).optional().nullable(),
});

export async function updateWorkspaceProfile(
  input: z.infer<typeof UpdateWorkspaceProfileSchema>
) {
  console.log("[updateWorkspaceProfile] Input:", input);

  try {
    const data = UpdateWorkspaceProfileSchema.parse(input);
    console.log("[updateWorkspaceProfile] Parsed data:", data);

    const supabase = await createClient();

    // Get current user's workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[updateWorkspaceProfile] No user found");
      return { error: "Unauthorized" };
    }
    console.log("[updateWorkspaceProfile] User:", user.id);

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    // Brand
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.tagline !== undefined) updateData.tagline = data.tagline || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.website_url !== undefined) updateData.website_url = data.website_url || null;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.industry !== undefined) updateData.industry = data.industry || null;
    if (data.team_size !== undefined) updateData.team_size = data.team_size || null;
    if (data.founded_year !== undefined) updateData.founded_year = data.founded_year || null;
    if (data.social_links !== undefined) updateData.social_links = data.social_links || null;
    // Legal
    if (data.legal_business_name !== undefined) updateData.legal_business_name = data.legal_business_name || null;
    if (data.business_type !== undefined) updateData.business_type = data.business_type || null;
    if (data.legal_address !== undefined) updateData.legal_address = data.legal_address || null;
    // Contact
    if (data.business_phone !== undefined) updateData.business_phone = data.business_phone || null;
    if (data.business_email !== undefined) updateData.business_email = data.business_email || null;
    // Tax & Billing
    if (data.tax_id_type !== undefined) updateData.tax_id_type = data.tax_id_type || null;
    if (data.tax_id_last4 !== undefined) updateData.tax_id_last4 = data.tax_id_last4 || null;
    if (data.default_currency !== undefined) updateData.default_currency = data.default_currency;
    if (data.payment_terms !== undefined) updateData.payment_terms = data.payment_terms || null;

    // Check slug uniqueness if updating slug
    if (data.slug) {
      const { data: existingStudio } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", data.slug)
        .neq("id", member.workspace_id)
        .single();

      if (existingStudio) {
        return { error: "This portal URL is already taken. Please choose a different one." };
      }
    }

    console.log("[updateWorkspaceProfile] Update data:", updateData);
    console.log("[updateWorkspaceProfile] Updating workspace:", member.workspace_id);

    // Update studio
    const { data: updatedStudio, error } = await supabase
      .from("workspaces")
      .update(updateData)
      .eq("id", member.workspace_id)
      .select("id, slug")
      .single();

    console.log("[updateWorkspaceProfile] Update result:", { updatedStudio, error });

    if (error) {
      console.error("[updateWorkspaceProfile] Update error:", error);
      if (error.code === "23505") {
        return { error: "This portal URL is already taken." };
      }
      return { error: error.message };
    }

    for (const field of WORKSPACE_PROFILE_PROVENANCE_FIELDS) {
      if (!(field in updateData)) continue;
      await writeWorkspaceFieldProvenance({
        workspaceId: member.workspace_id,
        field,
        value: provenanceValue(updateData[field]),
      });
    }

    // Revalidate all paths that might show workspace data
    revalidatePath("/hq");
    revalidatePath("/me");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

/** @deprecated Use updateWorkspaceProfile instead */
export const updateStudioProfile = updateWorkspaceProfile;

const WORKSPACE_LEGAL_ADDRESS_COLUMN_MAP: Record<MemoryAddressField, string> = {
  addressLine1: "legal_address_line_1",
  addressLine2: "legal_address_line_2",
  city: "legal_city",
  state: "legal_state",
  postalCode: "legal_postal_code",
  country: "legal_country",
};

const WORKSPACE_LEGAL_ADDRESS_PROVENANCE_FIELD_MAP: Record<
  MemoryAddressField,
  WorkspaceProfileFieldKey
> = {
  addressLine1: "legal_address_line1",
  addressLine2: "legal_address_line2",
  city: "legal_city",
  state: "legal_state",
  postalCode: "legal_postal_code",
  country: "legal_country",
};

export async function updateWorkspaceLegalAddress(input: {
  field: MemoryAddressField;
  value: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const column = WORKSPACE_LEGAL_ADDRESS_COLUMN_MAP[input.field];
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ [column]: input.value.trim() || null })
      .eq("id", member.workspace_id);

    if (updateError) {
      if (
        input.field === "addressLine1" &&
        /column/i.test(updateError.message)
      ) {
        const { error: legacyError } = await supabase
          .from("workspaces")
          .update({ legal_address: input.value.trim() || null })
          .eq("id", member.workspace_id);

        if (!legacyError) {
          await writeWorkspaceFieldProvenance({
            workspaceId: member.workspace_id,
            field: "legal_address",
            value: input.value.trim() || null,
          });
          revalidatePath("/me");
          revalidatePath("/settings");
          return { success: true };
        }
      }

      return { error: updateError.message };
    }

    await writeWorkspaceFieldProvenance({
      workspaceId: member.workspace_id,
      field: WORKSPACE_LEGAL_ADDRESS_PROVENANCE_FIELD_MAP[input.field],
      value: input.value.trim() || null,
    });

    const { data: workspace, error: readError } = await supabase
      .from("workspaces")
      .select(
        "legal_address_line_1, legal_address_line_2, legal_city, legal_state, legal_postal_code, legal_country, legal_address",
      )
      .eq("id", member.workspace_id)
      .single();

    if (!readError && workspace) {
      const summary = formatAddressSummary(legalAddressFromRow(workspace));
      const { error: syncError } = await supabase
        .from("workspaces")
        .update({ legal_address: summary })
        .eq("id", member.workspace_id);

      if (syncError) {
        return { error: syncError.message };
      }
    }

    revalidatePath("/me");
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { error: "An error occurred" };
  }
}

// ============================================================================
// STUDIO BRAND CONFIG ACTIONS
// ============================================================================

const UpdateBrandConfigSchema = z.object({
  color_primary: z.string().optional().nullable(),
  color_secondary: z.string().optional().nullable(),
  color_neutral: z.string().optional().nullable(),
  color_accent: z.string().optional().nullable(),
  font_heading: z.string().max(100).optional().nullable(),
  font_body: z.string().max(100).optional().nullable(),
  voice_tone: z.array(z.string()).optional().nullable(),
  voice_spectrums: z
    .object({
      formality: z.number().min(0).max(100),
      complexity: z.number().min(0).max(100),
      warmth: z.number().min(0).max(100),
      brevity: z.number().min(0).max(100),
    })
    .optional()
    .nullable(),
  voice_archetype: z.string().max(50).optional().nullable(),
  voice_style_guide: z.string().max(2000).optional().nullable(),
  voice_terminology: z
    .object({
      preferred: z.array(z.string()),
      avoid: z.array(z.string()),
    })
    .optional()
    .nullable(),
});

export async function updateStudioBrandConfig(
  input: z.infer<typeof UpdateBrandConfigSchema>
) {
  try {
    const data = UpdateBrandConfigSchema.parse(input);
    const supabase = await createClient();

    // Get current user's workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      workspace_id: member.workspace_id,
    };
    if (data.color_primary !== undefined) updateData.color_primary = data.color_primary || null;
    if (data.color_secondary !== undefined) updateData.color_secondary = data.color_secondary || null;
    if (data.color_neutral !== undefined) updateData.color_neutral = data.color_neutral || null;
    if (data.color_accent !== undefined) updateData.color_accent = data.color_accent || null;
    if (data.font_heading !== undefined) updateData.font_heading = data.font_heading || null;
    if (data.font_body !== undefined) updateData.font_body = data.font_body || null;
    if (data.voice_tone !== undefined) updateData.voice_tone = data.voice_tone || [];
    if (data.voice_spectrums !== undefined) updateData.voice_spectrums = data.voice_spectrums;
    if (data.voice_archetype !== undefined) updateData.voice_archetype = data.voice_archetype;
    if (data.voice_style_guide !== undefined) updateData.voice_style_guide = data.voice_style_guide || null;
    if (data.voice_terminology !== undefined) updateData.voice_terminology = data.voice_terminology || { preferred: [], avoid: [] };

    // Upsert brand config (create if not exists)
    const { error } = await supabase.from("workspace_brand_config").upsert(
      updateData,
      {
        onConflict: "workspace_id",
      }
    );

    if (error) return { error: error.message };

    revalidatePath("/hq");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

// ============================================================================
// STUDIO SERVICES ACTIONS
// ============================================================================

const CreateServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  pricing_type: z.enum(["fixed", "hourly", "retainer", "custom"]).optional().nullable(),
  price_min: z.coerce.number().min(0).optional().nullable(),
  price_max: z.coerce.number().min(0).optional().nullable(),
  base_price_cents: z.coerce.number().int().min(0).optional().nullable(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  typical_timeline: z.string().max(100).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function createStudioService(
  input: z.infer<typeof CreateServiceSchema>
) {
  try {
    const data = CreateServiceSchema.parse(input);
    const supabase = await createClient();

    // Get current user's workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("workspace_services")
      .select("display_order")
      .eq("workspace_id", member.workspace_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const { data: inserted, error } = await supabase
      .from("workspace_services")
      .insert({
        workspace_id: member.workspace_id,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        pricing_type: data.pricing_type || null,
        price_min: data.price_min || null,
        price_max: data.price_max || null,
        base_price_cents: data.base_price_cents || null,
        currency: data.currency,
        typical_timeline: data.typical_timeline || null,
        is_active: data.is_active,
        display_order: (maxOrder?.display_order || 0) + 1,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidatePath("/hq");
    revalidatePath("/me");
    return { success: true, id: inserted.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateStudioService(
  serviceId: string,
  input: z.infer<typeof CreateServiceSchema>
) {
  try {
    const data = CreateServiceSchema.parse(input);
    const supabase = await createClient();

    // Get current user's workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .update({
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        pricing_type: data.pricing_type || null,
        price_min: data.price_min || null,
        price_max: data.price_max || null,
        base_price_cents: data.base_price_cents || null,
        currency: data.currency,
        typical_timeline: data.typical_timeline || null,
        is_active: data.is_active,
      })
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/hq");
    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function deleteStudioService(serviceId: string) {
  try {
    const supabase = await createClient();

    // Get current user's workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .delete()
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/hq");
    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

// ============================================================================
// SERVICE RELATIONSHIPS ACTIONS
// ============================================================================

const ServiceRelationshipSchema = z.object({
  service_id: z.string().uuid(),
  related_service_id: z.string().uuid(),
  relationship_type: z.enum(["follow_on", "prerequisite", "substitute", "complement", "bundle_component"]),
  strength: z.number().int().min(0).max(100).default(50),
  typical_gap_days: z.number().int().min(0).nullable().optional(),
  recommendation_note: z.string().max(500).nullable().optional(),
  source: z.enum(["manual", "ai_proposed", "ai_learned"]).default("manual"),
});

export async function createServiceRelationship(
  input: z.infer<typeof ServiceRelationshipSchema>
) {
  try {
    const data = ServiceRelationshipSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can manage service relationships" };
    }

    // Verify both services belong to this workspace
    const { data: services } = await supabase
      .from("workspace_services")
      .select("id")
      .eq("workspace_id", member.workspace_id)
      .in("id", [data.service_id, data.related_service_id]);

    if (!services || services.length !== 2) {
      return { error: "One or both services not found in workspace" };
    }

    const { error } = await supabase.from("service_relationships").insert({
      service_id: data.service_id,
      related_service_id: data.related_service_id,
      relationship_type: data.relationship_type,
      strength: data.strength,
      typical_gap_days: data.typical_gap_days ?? null,
      recommendation_note: data.recommendation_note ?? null,
      source: data.source,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "This relationship already exists" };
      }
      return { error: error.message };
    }

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateServiceRelationship(
  relationshipId: string,
  input: Partial<z.infer<typeof ServiceRelationshipSchema>>
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can manage service relationships" };
    }

    // Build update object with only provided fields
    const update: Record<string, unknown> = {};
    if (input.relationship_type !== undefined) update.relationship_type = input.relationship_type;
    if (input.strength !== undefined) update.strength = input.strength;
    if (input.typical_gap_days !== undefined) update.typical_gap_days = input.typical_gap_days;
    if (input.recommendation_note !== undefined) update.recommendation_note = input.recommendation_note;
    if (input.source !== undefined) update.source = input.source;

    if (Object.keys(update).length === 0) {
      return { error: "No fields to update" };
    }

    // Verify the relationship belongs to a service in this workspace
    const { error } = await supabase
      .from("service_relationships")
      .update(update)
      .eq("id", relationshipId)
      .eq(
        "service_id",
        supabase
          .from("workspace_services")
          .select("id")
          .eq("workspace_id", member.workspace_id)
      );

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

export async function deleteServiceRelationship(relationshipId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can manage service relationships" };
    }

    // Delete relationship if service belongs to workspace (RLS handles this)
    const { error } = await supabase
      .from("service_relationships")
      .delete()
      .eq("id", relationshipId);

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

// ============================================================================
// SERVICE SALES INTELLIGENCE ACTIONS
// ============================================================================

const ServiceSalesContextSchema = z.object({
  objections: z.array(z.object({
    objection: z.string(),
    response: z.string(),
    source: z.enum(["operator", "learned"]),
  })).optional(),
  competitive_positioning: z.object({
    vs_diy: z.string().nullable().optional(),
    vs_agencies: z.string().nullable().optional(),
    vs_freelancers: z.string().nullable().optional(),
    unique_advantage: z.string().nullable().optional(),
  }).optional(),
  ideal_timing: z.object({
    triggers: z.array(z.string()).optional(),
    buying_signals: z.array(z.string()).optional(),
    seasonal_relevance: z.string().nullable().optional(),
  }).optional(),
});

const ServicePricingIntelligenceSchema = z.object({
  roi_metrics: z.array(z.object({
    metric: z.string(),
    typical_result: z.string(),
    proof_source: z.string().nullable().optional(),
  })).optional(),
  payback_period: z.string().nullable().optional(),
  discount_rules: z.array(z.object({
    condition: z.string(),
    discount_percent: z.number(),
    approval_required: z.boolean(),
  })).optional(),
  floor_price_cents: z.number().int().nullable().optional(),
  anchors: z.object({
    agency_equivalent_cents: z.number().int().nullable().optional(),
    diy_cost_estimate_cents: z.number().int().nullable().optional(),
    opportunity_cost: z.string().nullable().optional(),
  }).optional(),
});

const ServiceAIGenerationContextSchema = z.object({
  tone: z.enum(["formal", "conversational", "consultative", "persuasive"]).nullable().optional(),
  personality_notes: z.string().nullable().optional(),
  include_keywords: z.array(z.string()).optional(),
  avoid_keywords: z.array(z.string()).optional(),
  primary_outcomes: z.array(z.string()).optional(),
  proof_priority: z.array(z.enum(["metrics", "testimonials", "case_studies", "awards"])).optional(),
  pitch_variants: z.object({
    elevator: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    proposal_intro: z.string().nullable().optional(),
  }).optional(),
});

export async function updateServiceSalesContext(
  serviceId: string,
  input: z.infer<typeof ServiceSalesContextSchema>,
  source: "manual" | "ai_proposed" | "ai_confirmed" = "manual"
) {
  try {
    const data = ServiceSalesContextSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can update sales context" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .update({
        ai_sales_context: data,
        ai_sales_context_source: source,
      })
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateServicePricingIntelligence(
  serviceId: string,
  input: z.infer<typeof ServicePricingIntelligenceSchema>,
  source: "manual" | "ai_proposed" | "ai_confirmed" = "manual"
) {
  try {
    const data = ServicePricingIntelligenceSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can update pricing intelligence" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .update({
        pricing_intelligence: data,
        pricing_intelligence_source: source,
      })
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateServiceAIGenerationContext(
  serviceId: string,
  input: z.infer<typeof ServiceAIGenerationContextSchema>,
  source: "manual" | "ai_proposed" | "ai_confirmed" = "manual"
) {
  try {
    const data = ServiceAIGenerationContextSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can update AI generation context" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .update({
        ai_generation_context: data,
        ai_generation_context_source: source,
      })
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateServiceIsBundle(
  serviceId: string,
  isBundle: boolean
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can update bundle status" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .update({ is_bundle: isBundle })
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

const ServiceDeliverableSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  format: z.string().max(100).nullable().optional(),
  is_required: z.boolean().default(true),
});

const ServiceDeliverablesSchema = z.array(ServiceDeliverableSchema);

export async function updateServiceDeliverables(
  serviceId: string,
  input: z.infer<typeof ServiceDeliverablesSchema>,
  source: "manual" | "ai_proposed" | "ai_confirmed" = "manual"
) {
  try {
    const data = ServiceDeliverablesSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only admins can update deliverables" };
    }

    const { error } = await supabase
      .from("workspace_services")
      .update({
        deliverables: data,
        deliverables_source: source,
      })
      .eq("id", serviceId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/me");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

// ============================================================================
// CONTRACT TEMPLATES ACTIONS
// ============================================================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["msa", "sow", "nda", "retainer", "custom"]),
  content: z.string(),
  variables: z.record(z.unknown()).optional().nullable(),
  is_default: z.boolean().default(false),
});

export async function createContractTemplate(
  input: z.infer<typeof CreateTemplateSchema>
) {
  try {
    const data = CreateTemplateSchema.parse(input);
    const supabase = await createClient();

    // Get current user's workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id:workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("contract_templates")
      .select("display_order")
      .eq("workspace_id", member.workspace_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    // If setting as default, unset other defaults in same category
    if (data.is_default) {
      await supabase
        .from("contract_templates")
        .update({ is_default: false })
        .eq("workspace_id", member.workspace_id)
        .eq("category", data.category);
    }

    const { error } = await supabase.from("contract_templates").insert({
      workspace_id: member.workspace_id,
      name: data.name,
      description: data.description || null,
      category: data.category,
      content: data.content,
      variables: data.variables || null,
      is_default: data.is_default,
      display_order: (maxOrder?.display_order || 0) + 1,
    });

    if (error) return { error: error.message };

    revalidatePath("/settings/plays");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateContractTemplate(
  templateId: string,
  input: z.infer<typeof CreateTemplateSchema>
) {
  try {
    const data = CreateTemplateSchema.parse(input);
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id:workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // If setting as default, unset other defaults in same category
    if (data.is_default) {
      await supabase
        .from("contract_templates")
        .update({ is_default: false })
        .eq("workspace_id", member.workspace_id)
        .eq("category", data.category)
        .neq("id", templateId);
    }

    const { error } = await supabase
      .from("contract_templates")
      .update({
        name: data.name,
        description: data.description || null,
        category: data.category,
        content: data.content,
        variables: data.variables || null,
        is_default: data.is_default,
      })
      .eq("id", templateId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/plays");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function deleteContractTemplate(templateId: string) {
  try {
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id:workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("contract_templates")
      .delete()
      .eq("id", templateId)
      .eq("workspace_id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/plays");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

export async function duplicateContractTemplate(templateId: string) {
  try {
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id:workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get the template to duplicate
    const { data: template } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("id", templateId)
      .eq("workspace_id", member.workspace_id)
      .single();

    if (!template) return { error: "Template not found" };

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("contract_templates")
      .select("display_order")
      .eq("workspace_id", member.workspace_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase.from("contract_templates").insert({
      workspace_id: member.workspace_id,
      name: `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      content: template.content,
      variables: template.variables,
      is_default: false, // Duplicates are never default
      display_order: (maxOrder?.display_order || 0) + 1,
    });

    if (error) return { error: error.message };

    revalidatePath("/settings/plays");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

// ============================================================================
// STUDIO TEAM ACTIONS
// ============================================================================

const InviteTeamMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "viewer"]),
});

export async function inviteTeamMember(
  input: z.infer<typeof InviteTeamMemberSchema>
) {
  try {
    const data = InviteTeamMemberSchema.parse(input);
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only owners and admins can invite members" };
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", member.workspace_id)
      .eq("email", data.email)
      .single();

    if (existingMember) {
      return { error: "This email is already a team member" };
    }

    // For now, we add them directly (in a real app, you'd send an invite email)
    // This assumes the user already exists in auth.users
    const { data: invitedUser } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", data.email)
      .single();

    if (!invitedUser) {
      // User doesn't exist - in production, send invite email
      // For now, we'll create a pending invite record or return an error
      return { error: "User not found. Invite feature coming soon." };
    }

    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: member.workspace_id,
      user_id: invitedUser.id,
      role: data.role,
      email: data.email,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "This user is already a team member" };
      }
      return { error: error.message };
    }

    revalidatePath("/settings/business");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateTeamMemberRole(
  memberId: string,
  role: "admin" | "member" | "viewer"
) {
  try {
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: currentMember } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!currentMember) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(currentMember.role)) {
      return { error: "Only owners and admins can change roles" };
    }

    // Get the member being updated
    const { data: targetMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("id", memberId)
      .eq("workspace_id", currentMember.workspace_id)
      .single();

    if (!targetMember) return { error: "Member not found" };

    // Cannot change owner role
    if (targetMember.role === "owner") {
      return { error: "Cannot change the owner's role" };
    }

    // Admins cannot promote to admin (only owners can)
    if (currentMember.role === "admin" && role === "admin") {
      return { error: "Only the owner can promote members to admin" };
    }

    const { error } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("id", memberId)
      .eq("workspace_id", currentMember.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/business");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

export async function removeTeamMember(memberId: string) {
  try {
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: currentMember } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!currentMember) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(currentMember.role)) {
      return { error: "Only owners and admins can remove members" };
    }

    // Get the member being removed
    const { data: targetMember } = await supabase
      .from("workspace_members")
      .select("role, user_id")
      .eq("id", memberId)
      .eq("workspace_id", currentMember.workspace_id)
      .single();

    if (!targetMember) return { error: "Member not found" };

    // Cannot remove owner
    if (targetMember.role === "owner") {
      return { error: "Cannot remove the studio owner" };
    }

    // Cannot remove yourself (use leave studio instead)
    if (targetMember.user_id === user.id) {
      return { error: "You cannot remove yourself. Use 'Leave Studio' instead." };
    }

    // Admins cannot remove other admins
    if (currentMember.role === "admin" && targetMember.role === "admin") {
      return { error: "Only the owner can remove admins" };
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", currentMember.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/business");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

// ============================================================================
// CLIENT BILLING SETTINGS ACTIONS
// ============================================================================

const UpdateClientBillingSchema = z.object({
  payment_terms: z.enum(["due_on_receipt", "net_15", "net_30", "net_45", "net_60"]).optional(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).optional(),
  late_fee_enabled: z.boolean().optional(),
  late_fee_percent: z.coerce.number().min(0).max(100).optional(),
  tax_id: z.string().max(50).optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  tax_label: z.string().max(20).optional(),
  invoice_prefix: z.string().max(10).optional(),
  next_invoice_number: z.coerce.number().min(1).optional(),
  invoice_notes: z.string().max(500).optional(),
});

export async function updateClientBillingSettings(
  input: z.infer<typeof UpdateClientBillingSchema>
) {
  try {
    const data = UpdateClientBillingSchema.parse(input);
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member) return { error: "Workspace not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get current settings
    const { data: studio } = await supabase
      .from("workspaces")
      .select("settings")
      .eq("id", member.workspace_id)
      .single();

    const currentSettings = (studio?.settings as Record<string, unknown>) || {};
    const currentBilling = (currentSettings.client_billing as Record<string, unknown>) || {};

    // Merge new settings
    const updatedBilling = {
      ...currentBilling,
      ...Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      ),
    };

    const { error } = await supabase
      .from("workspaces")
      .update({
        settings: {
          ...currentSettings,
          client_billing: updatedBilling,
        },
      })
      .eq("id", member.workspace_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/billing");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}
