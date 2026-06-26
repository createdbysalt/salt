"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import type {
  CreateServiceInput,
  UpdateServiceInput,
  StudioService,
  ServiceCategory,
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
} from "./types"
import { DEFAULT_SERVICE_CATEGORIES } from "./types"

async function getWorkspaceId(): Promise<{ workspaceId: string } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Authentication required" }
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id:workspace_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { error: "No workspace found" }
  }

  return { workspaceId: membership.workspace_id }
}

export async function createService(input: CreateServiceInput) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { data, error } = await supabase
    .from("workspace_services")
    .insert({
      workspace_id: studioResult.workspaceId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null, // Legacy
      category_id: input.category_id || null, // New FK
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
      // Retainer-specific fields
      hours_included: input.hours_included ?? null,
      response_time: input.response_time?.trim() || null,
      rollover_hours: input.rollover_hours ?? null,
      billing_interval: input.billing_interval || "monthly",
      is_recommended: input.is_recommended ?? false,
      services_included: input.services_included || [],
    })
    .select()
    .single()

  if (error) {
    console.error("Create service error:", error)
    return { success: false, error: "Failed to create service" }
  }

  revalidatePath("/billing")
  return { success: true, data }
}

export async function updateService(input: UpdateServiceInput) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.category !== undefined) updates.category = input.category?.trim() || null // Legacy
  if (input.category_id !== undefined) updates.category_id = input.category_id // New FK (can be null)
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
  // Retainer-specific fields
  if (input.hours_included !== undefined) updates.hours_included = input.hours_included
  if (input.response_time !== undefined) updates.response_time = input.response_time?.trim() || null
  if (input.rollover_hours !== undefined) updates.rollover_hours = input.rollover_hours
  if (input.billing_interval !== undefined) updates.billing_interval = input.billing_interval
  if (input.is_recommended !== undefined) updates.is_recommended = input.is_recommended
  if (input.services_included !== undefined) updates.services_included = input.services_included

  // If pricing changed, mark as needing re-sync
  if (input.price_min !== undefined || input.price_max !== undefined || input.pricing_type !== undefined) {
    updates.stripe_sync_status = "not_synced"
  }

  const { data, error } = await supabase
    .from("workspace_services")
    .update(updates)
    .eq("id", input.id)
    .eq("workspace_id", studioResult.workspaceId)
    .select()
    .single()

  if (error) {
    console.error("Update service error:", error)
    return { success: false, error: "Failed to update service" }
  }

  revalidatePath("/billing")
  return { success: true, data }
}

export async function deleteService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .delete()
    .eq("id", serviceId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Delete service error:", error)
    return { success: false, error: "Failed to delete service" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function getServices(): Promise<{ success: boolean; data: StudioService[]; error?: string }> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, data: [], error: studioResult.error }
  }

  const { data, error } = await supabase
    .from("workspace_services")
    .select("*")
    .eq("workspace_id", studioResult.workspaceId)
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
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase.rpc("seed_default_services", {
    p_workspace_id: studioResult.workspaceId,
  })

  if (error) {
    console.error("Seed services error:", error)
    return { success: false, error: "Failed to seed default services" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function toggleServiceActive(serviceId: string, isActive: boolean) {
  return updateService({ id: serviceId, is_active: isActive })
}

export async function reorderServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  // Update display_order for each service
  const updates = serviceIds.map((id, index) =>
    supabase
      .from("workspace_services")
      .update({ display_order: index })
      .eq("id", id)
      .eq("workspace_id", studioResult.workspaceId)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((r) => r.error)

  if (hasError) {
    return { success: false, error: "Failed to reorder services" }
  }

  revalidatePath("/billing")
  return { success: true }
}

// ============================================================================
// Archive/Delete Actions
// ============================================================================

export async function archiveService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Archive service error:", error)
    return { success: false, error: "Failed to archive service" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function unarchiveService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ archived_at: null })
    .eq("id", serviceId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Unarchive service error:", error)
    return { success: false, error: "Failed to unarchive service" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function trashService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Trash service error:", error)
    return { success: false, error: "Failed to move service to trash" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function restoreService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ deleted_at: null })
    .eq("id", serviceId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Restore service error:", error)
    return { success: false, error: "Failed to restore service" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function permanentlyDeleteService(serviceId: string) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .delete()
    .eq("id", serviceId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Permanently delete service error:", error)
    return { success: false, error: "Failed to permanently delete service" }
  }

  revalidatePath("/billing")
  return { success: true }
}

// Bulk operations
export async function bulkArchiveServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ archived_at: new Date().toISOString() })
    .in("id", serviceIds)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Bulk archive services error:", error)
    return { success: false, error: "Failed to archive services" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function bulkUnarchiveServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ archived_at: null })
    .in("id", serviceIds)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Bulk unarchive services error:", error)
    return { success: false, error: "Failed to unarchive services" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function bulkTrashServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", serviceIds)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Bulk trash services error:", error)
    return { success: false, error: "Failed to move services to trash" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function bulkRestoreServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .update({ deleted_at: null })
    .in("id", serviceIds)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Bulk restore services error:", error)
    return { success: false, error: "Failed to restore services" }
  }

  revalidatePath("/billing")
  return { success: true }
}

export async function bulkPermanentlyDeleteServices(serviceIds: string[]) {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const { error } = await supabase
    .from("workspace_services")
    .delete()
    .in("id", serviceIds)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Bulk permanently delete services error:", error)
    return { success: false, error: "Failed to permanently delete services" }
  }

  revalidatePath("/billing")
  return { success: true }
}

// ============================================================================
// Service Categories Actions
// ============================================================================

export async function getServiceCategories(): Promise<{
  success: boolean
  data: ServiceCategory[]
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, data: [], error: studioResult.error }
  }

  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .eq("workspace_id", studioResult.workspaceId)
    .order("sort_order")

  if (error) {
    console.error("Get service categories error:", error)
    return { success: false, data: [], error: "Failed to fetch categories" }
  }

  return { success: true, data: data ?? [] }
}

export async function seedDefaultServiceCategories(): Promise<{
  success: boolean
  data?: ServiceCategory[]
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  // Check if categories already exist for this studio
  const { data: existing } = await supabase
    .from("service_categories")
    .select("id")
    .eq("workspace_id", studioResult.workspaceId)
    .limit(1)

  if (existing && existing.length > 0) {
    // Already seeded, fetch and return existing
    const { data } = await supabase
      .from("service_categories")
      .select("*")
      .eq("workspace_id", studioResult.workspaceId)
      .order("sort_order")

    return { success: true, data: data ?? [] }
  }

  // Seed default categories
  const categoriesToInsert = DEFAULT_SERVICE_CATEGORIES.map((cat, index) => ({
    workspace_id: studioResult.workspaceId,
    name: cat.name,
    sort_order: index,
  }))

  const { data, error } = await supabase
    .from("service_categories")
    .insert(categoriesToInsert)
    .select()

  if (error) {
    console.error("Seed service categories error:", error)
    return { success: false, error: "Failed to seed default categories" }
  }

  revalidatePath("/settings/business")
  revalidatePath("/billing")
  return { success: true, data: data ?? [] }
}

export async function createServiceCategory(input: CreateServiceCategoryInput): Promise<{
  success: boolean
  data?: ServiceCategory
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from("service_categories")
    .select("sort_order")
    .eq("workspace_id", studioResult.workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from("service_categories")
    .insert({
      workspace_id: studioResult.workspaceId,
      name: input.name.trim(),
      color: input.color || null,
      sort_order: input.sort_order ?? nextOrder,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists" }
    }
    console.error("Create service category error:", error)
    return { success: false, error: "Failed to create category" }
  }

  revalidatePath("/settings/business")
  revalidatePath("/billing")
  return { success: true, data }
}

export async function updateServiceCategory(input: UpdateServiceCategoryInput): Promise<{
  success: boolean
  data?: ServiceCategory
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.color !== undefined) updates.color = input.color
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order

  const { data, error } = await supabase
    .from("service_categories")
    .update(updates)
    .eq("id", input.id)
    .eq("workspace_id", studioResult.workspaceId)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists" }
    }
    console.error("Update service category error:", error)
    return { success: false, error: "Failed to update category" }
  }

  revalidatePath("/settings/business")
  revalidatePath("/billing")
  return { success: true, data }
}

export async function deleteServiceCategory(categoryId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  // Note: Services using this category will have category_id set to NULL (ON DELETE SET NULL)
  const { error } = await supabase
    .from("service_categories")
    .delete()
    .eq("id", categoryId)
    .eq("workspace_id", studioResult.workspaceId)

  if (error) {
    console.error("Delete service category error:", error)
    return { success: false, error: "Failed to delete category" }
  }

  revalidatePath("/settings/business")
  revalidatePath("/billing")
  return { success: true }
}

export async function reorderServiceCategories(categoryIds: string[]): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, error: studioResult.error }
  }

  // Update sort_order for each category
  const updates = categoryIds.map((id, index) =>
    supabase
      .from("service_categories")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("workspace_id", studioResult.workspaceId)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((r) => r.error)

  if (hasError) {
    return { success: false, error: "Failed to reorder categories" }
  }

  revalidatePath("/settings/business")
  revalidatePath("/billing")
  return { success: true }
}

// Migrate legacy free-text categories to category_id
export async function migrateServiceCategories(): Promise<{
  success: boolean
  migratedCount: number
  error?: string
}> {
  const supabase = await createClient()
  const studioResult = await getWorkspaceId()

  if ("error" in studioResult) {
    return { success: false, migratedCount: 0, error: studioResult.error }
  }

  // Get all categories for this studio
  const { data: categories } = await supabase
    .from("service_categories")
    .select("id, name")
    .eq("workspace_id", studioResult.workspaceId)

  if (!categories || categories.length === 0) {
    return { success: true, migratedCount: 0 }
  }

  // Get services with legacy category but no category_id
  const { data: services } = await supabase
    .from("workspace_services")
    .select("id, category")
    .eq("workspace_id", studioResult.workspaceId)
    .not("category", "is", null)
    .is("category_id", null)

  if (!services || services.length === 0) {
    return { success: true, migratedCount: 0 }
  }

  // Match and update
  let migratedCount = 0
  for (const service of services) {
    const matchingCategory = categories.find(
      (c) => c.name.toLowerCase() === service.category?.toLowerCase()
    )
    if (matchingCategory) {
      await supabase
        .from("workspace_services")
        .update({ category_id: matchingCategory.id })
        .eq("id", service.id)
      migratedCount++
    }
  }

  revalidatePath("/billing")
  return { success: true, migratedCount }
}
