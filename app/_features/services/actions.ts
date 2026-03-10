"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import type { CreateServiceInput, UpdateServiceInput, StudioService } from "./types"

async function getStudioId(): Promise<{ studioId: string } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Authentication required" }
  }

  const { data: membership, error: membershipError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { error: "No studio found" }
  }

  return { studioId: membership.studio_id }
}

export async function createService(input: CreateServiceInput) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { data, error } = await supabase
    .from("studio_services")
    .insert({
      studio_id: studioResult.studioId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      pricing_type: input.pricing_type || null,
      price_min: input.price_min || null,
      price_max: input.price_max || null,
      currency: input.currency || "USD",
      deliverables: input.deliverables || [],
      typical_timeline: input.typical_timeline?.trim() || null,
      feature_tag_ids: input.feature_tag_ids || [],
      deliverable_tag_ids: input.deliverable_tag_ids || [],
      is_active: true,
      stripe_sync_status: "not_synced",
    })
    .select()
    .single()

  if (error) {
    console.error("Create service error:", error)
    return { success: false, error: "Failed to create service" }
  }

  revalidatePath("/studio/billing")
  return { success: true, data }
}

export async function updateService(input: UpdateServiceInput) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.category !== undefined) updates.category = input.category?.trim() || null
  if (input.pricing_type !== undefined) updates.pricing_type = input.pricing_type
  if (input.price_min !== undefined) updates.price_min = input.price_min
  if (input.price_max !== undefined) updates.price_max = input.price_max
  if (input.currency !== undefined) updates.currency = input.currency
  if (input.deliverables !== undefined) updates.deliverables = input.deliverables
  if (input.typical_timeline !== undefined) updates.typical_timeline = input.typical_timeline?.trim() || null
  if (input.is_active !== undefined) updates.is_active = input.is_active
  if (input.display_order !== undefined) updates.display_order = input.display_order
  if (input.feature_tag_ids !== undefined) updates.feature_tag_ids = input.feature_tag_ids
  if (input.deliverable_tag_ids !== undefined) updates.deliverable_tag_ids = input.deliverable_tag_ids

  // If pricing changed, mark as needing re-sync
  if (input.price_min !== undefined || input.price_max !== undefined || input.pricing_type !== undefined) {
    updates.stripe_sync_status = "not_synced"
  }

  const { data, error } = await supabase
    .from("studio_services")
    .update(updates)
    .eq("id", input.id)
    .eq("studio_id", studioResult.studioId)
    .select()
    .single()

  if (error) {
    console.error("Update service error:", error)
    return { success: false, error: "Failed to update service" }
  }

  revalidatePath("/studio/billing")
  return { success: true, data }
}

export async function deleteService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .delete()
    .eq("id", serviceId)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Delete service error:", error)
    return { success: false, error: "Failed to delete service" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function getServices(): Promise<{ success: boolean; data: StudioService[]; error?: string }> {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, data: [], error: studioResult.error }
  }

  const { data, error } = await supabase
    .from("studio_services")
    .select("*")
    .eq("studio_id", studioResult.studioId)
    .order("category")
    .order("display_order")

  if (error) {
    console.error("Get services error:", error)
    return { success: false, data: [], error: "Failed to fetch services" }
  }

  return { success: true, data: data ?? [] }
}

export async function seedDefaultServices() {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase.rpc("seed_default_services", {
    p_studio_id: studioResult.studioId,
  })

  if (error) {
    console.error("Seed services error:", error)
    return { success: false, error: "Failed to seed default services" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function toggleServiceActive(serviceId: string, isActive: boolean) {
  return updateService({ id: serviceId, is_active: isActive })
}

export async function reorderServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  // Update display_order for each service
  const updates = serviceIds.map((id, index) =>
    supabase
      .from("studio_services")
      .update({ display_order: index })
      .eq("id", id)
      .eq("studio_id", studioResult.studioId)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((r) => r.error)

  if (hasError) {
    return { success: false, error: "Failed to reorder services" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

// ============================================================================
// Archive/Delete Actions
// ============================================================================

export async function archiveService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Archive service error:", error)
    return { success: false, error: "Failed to archive service" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function unarchiveService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ archived_at: null })
    .eq("id", serviceId)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Unarchive service error:", error)
    return { success: false, error: "Failed to unarchive service" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function trashService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Trash service error:", error)
    return { success: false, error: "Failed to move service to trash" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function restoreService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ deleted_at: null })
    .eq("id", serviceId)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Restore service error:", error)
    return { success: false, error: "Failed to restore service" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function permanentlyDeleteService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .delete()
    .eq("id", serviceId)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Permanently delete service error:", error)
    return { success: false, error: "Failed to permanently delete service" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

// Bulk operations
export async function bulkArchiveServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ archived_at: new Date().toISOString() })
    .in("id", serviceIds)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Bulk archive services error:", error)
    return { success: false, error: "Failed to archive services" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function bulkUnarchiveServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ archived_at: null })
    .in("id", serviceIds)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Bulk unarchive services error:", error)
    return { success: false, error: "Failed to unarchive services" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function bulkTrashServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", serviceIds)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Bulk trash services error:", error)
    return { success: false, error: "Failed to move services to trash" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function bulkRestoreServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .update({ deleted_at: null })
    .in("id", serviceIds)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Bulk restore services error:", error)
    return { success: false, error: "Failed to restore services" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}

export async function bulkPermanentlyDeleteServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getStudioId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("studio_services")
    .delete()
    .in("id", serviceIds)
    .eq("studio_id", studioResult.studioId)

  if (error) {
    console.error("Bulk permanently delete services error:", error)
    return { success: false, error: "Failed to permanently delete services" }
  }

  revalidatePath("/studio/billing")
  return { success: true }
}
