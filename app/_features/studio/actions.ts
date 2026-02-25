"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";

// ============================================================================
// STUDIO PROFILE ACTIONS
// ============================================================================

const UpdateStudioProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  tagline: z.string().max(140).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  website_url: z.string().url().or(z.literal("")).optional().nullable(),
  team_size: z.enum(["solo", "2-5", "6-10", "11-25", "25+"]).optional().nullable(),
  founded_year: z.coerce.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  social_links: z
    .object({
      x: z.string().optional().nullable(),
      twitter: z.string().optional().nullable(), // Legacy support
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
});

export async function updateStudioProfile(
  input: z.infer<typeof UpdateStudioProfileSchema>
) {
  try {
    const data = UpdateStudioProfileSchema.parse(input);
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.tagline !== undefined) updateData.tagline = data.tagline || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.website_url !== undefined) updateData.website_url = data.website_url || null;
    if (data.team_size !== undefined) updateData.team_size = data.team_size || null;
    if (data.founded_year !== undefined) updateData.founded_year = data.founded_year || null;
    if (data.social_links !== undefined) updateData.social_links = data.social_links || null;

    // Update studio
    const { error } = await supabase
      .from("studios")
      .update(updateData)
      .eq("id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
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

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      studio_id: member.studio_id,
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
    const { error } = await supabase.from("studio_brand_config").upsert(
      updateData,
      {
        onConflict: "studio_id",
      }
    );

    if (error) return { error: error.message };

    revalidatePath("/studio");
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

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("studio_services")
      .select("display_order")
      .eq("studio_id", member.studio_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase.from("studio_services").insert({
      studio_id: member.studio_id,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      pricing_type: data.pricing_type || null,
      price_min: data.price_min || null,
      price_max: data.price_max || null,
      currency: data.currency,
      typical_timeline: data.typical_timeline || null,
      is_active: data.is_active,
      display_order: (maxOrder?.display_order || 0) + 1,
    });

    if (error) return { error: error.message };

    revalidatePath("/studio");
    return { success: true };
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

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("studio_services")
      .update({
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        pricing_type: data.pricing_type || null,
        price_min: data.price_min || null,
        price_max: data.price_max || null,
        currency: data.currency,
        typical_timeline: data.typical_timeline || null,
        is_active: data.is_active,
      })
      .eq("id", serviceId)
      .eq("studio_id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/studio");
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

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("studio_services")
      .delete()
      .eq("id", serviceId)
      .eq("studio_id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    return { error: "An error occurred" };
  }
}

// ============================================================================
// PROJECT TYPES ACTIONS
// ============================================================================

const CreateProjectTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export async function createProjectType(
  input: z.infer<typeof CreateProjectTypeSchema>
) {
  try {
    const data = CreateProjectTypeSchema.parse(input);
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("studio_project_types")
      .select("display_order")
      .eq("studio_id", member.studio_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase.from("studio_project_types").insert({
      studio_id: member.studio_id,
      name: data.name,
      description: data.description || null,
      display_order: (maxOrder?.display_order || 0) + 1,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "A project type with this name already exists" };
      }
      return { error: error.message };
    }

    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function updateProjectType(
  typeId: string,
  input: z.infer<typeof CreateProjectTypeSchema>
) {
  try {
    const data = CreateProjectTypeSchema.parse(input);
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("studio_project_types")
      .update({
        name: data.name,
        description: data.description || null,
      })
      .eq("id", typeId)
      .eq("studio_id", member.studio_id);

    if (error) {
      if (error.code === "23505") {
        return { error: "A project type with this name already exists" };
      }
      return { error: error.message };
    }

    revalidatePath("/settings/studio/tags");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}

export async function deleteProjectType(typeId: string) {
  try {
    const supabase = await createClient();

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("studio_project_types")
      .delete()
      .eq("id", typeId)
      .eq("studio_id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/tags");
    return { success: true };
  } catch (error) {
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

    // Get current user's studio
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: member } = await supabase
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("contract_templates")
      .select("display_order")
      .eq("studio_id", member.studio_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    // If setting as default, unset other defaults in same category
    if (data.is_default) {
      await supabase
        .from("contract_templates")
        .update({ is_default: false })
        .eq("studio_id", member.studio_id)
        .eq("category", data.category);
    }

    const { error } = await supabase.from("contract_templates").insert({
      studio_id: member.studio_id,
      name: data.name,
      description: data.description || null,
      category: data.category,
      content: data.content,
      variables: data.variables || null,
      is_default: data.is_default,
      display_order: (maxOrder?.display_order || 0) + 1,
    });

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/templates");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // If setting as default, unset other defaults in same category
    if (data.is_default) {
      await supabase
        .from("contract_templates")
        .update({ is_default: false })
        .eq("studio_id", member.studio_id)
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
      .eq("studio_id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/templates");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("contract_templates")
      .delete()
      .eq("id", templateId)
      .eq("studio_id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/templates");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin", "member"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get the template to duplicate
    const { data: template } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("id", templateId)
      .eq("studio_id", member.studio_id)
      .single();

    if (!template) return { error: "Template not found" };

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("contract_templates")
      .select("display_order")
      .eq("studio_id", member.studio_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase.from("contract_templates").insert({
      studio_id: member.studio_id,
      name: `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      content: template.content,
      variables: template.variables,
      is_default: false, // Duplicates are never default
      display_order: (maxOrder?.display_order || 0) + 1,
    });

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/templates");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Only owners and admins can invite members" };
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from("studio_members")
      .select("id")
      .eq("studio_id", member.studio_id)
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

    const { error } = await supabase.from("studio_members").insert({
      studio_id: member.studio_id,
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

    revalidatePath("/settings/studio/team");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember) return { error: "Studio not found" };
    if (!["owner", "admin"].includes(currentMember.role)) {
      return { error: "Only owners and admins can change roles" };
    }

    // Get the member being updated
    const { data: targetMember } = await supabase
      .from("studio_members")
      .select("role")
      .eq("id", memberId)
      .eq("studio_id", currentMember.studio_id)
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
      .from("studio_members")
      .update({ role })
      .eq("id", memberId)
      .eq("studio_id", currentMember.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/team");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember) return { error: "Studio not found" };
    if (!["owner", "admin"].includes(currentMember.role)) {
      return { error: "Only owners and admins can remove members" };
    }

    // Get the member being removed
    const { data: targetMember } = await supabase
      .from("studio_members")
      .select("role, user_id")
      .eq("id", memberId)
      .eq("studio_id", currentMember.studio_id)
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
      .from("studio_members")
      .delete()
      .eq("id", memberId)
      .eq("studio_id", currentMember.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/team");
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
      .from("studio_members")
      .select("studio_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return { error: "Studio not found" };
    if (!["owner", "admin"].includes(member.role)) {
      return { error: "Insufficient permissions" };
    }

    // Get current settings
    const { data: studio } = await supabase
      .from("studios")
      .select("settings")
      .eq("id", member.studio_id)
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
      .from("studios")
      .update({
        settings: {
          ...currentSettings,
          client_billing: updatedBilling,
        },
      })
      .eq("id", member.studio_id);

    if (error) return { error: error.message };

    revalidatePath("/settings/studio/client-billing");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: "An error occurred" };
  }
}
