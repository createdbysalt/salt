"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/app/_lib/supabase/server"
import type {
  ServiceItem,
  CreateServiceItemInput,
  UpdateServiceItemInput,
} from "../types"

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
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  if (membershipError || !membership) {
    return { error: "No workspace found" }
  }

  return { workspaceId: membership.workspace_id }
}

export async function createServiceItem(input: CreateServiceItemInput): Promise<{
  success: boolean
  data?: ServiceItem
  error?: string
}> {
  const supabase = await createClient()
  const workspaceResult = await getWorkspaceId()

  if ("error" in workspaceResult) {
    return { success: false, error: workspaceResult.error }
  }

  if (!input.project_id && !input.billing_record_id) {
    return { success: false, error: "Must specify project_id or billing_record_id" }
  }

  const { data, error } = await supabase
    .from("service_items")
    .insert({
      workspace_id: workspaceResult.workspaceId,
      service_id: input.service_id || null,
      project_id: input.project_id || null,
      billing_record_id: input.billing_record_id || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      deliverables: input.deliverables || [],
      pricing_type: input.pricing_type,
      quantity: input.quantity ?? 1,
      unit_price_cents: input.unit_price_cents ?? null,
      total_price_cents: input.total_price_cents ?? null,
      currency: input.currency || "USD",
      hours_estimate: input.hours_estimate ?? null,
      hourly_rate_cents: input.hourly_rate_cents ?? null,
      billing_interval: input.billing_interval ?? null,
      hours_included: input.hours_included ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Create service item error:", error)
    return { success: false, error: "Failed to create service item" }
  }

  if (input.project_id) {
    revalidatePath(`/work/${input.project_id}`)
  }

  return { success: true, data: data as ServiceItem }
}

export async function createServiceItemFromService(
  serviceId: string,
  targetId: string,
  targetType: "project" | "billing_record"
): Promise<{
  success: boolean
  data?: ServiceItem
  error?: string
}> {
  const supabase = await createClient()
  const workspaceResult = await getWorkspaceId()

  if ("error" in workspaceResult) {
    return { success: false, error: workspaceResult.error }
  }

  const { data: service, error: serviceError } = await supabase
    .from("workspace_services")
    .select("*")
    .eq("id", serviceId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .single()

  if (serviceError || !service) {
    return { success: false, error: "Service not found" }
  }

  const { data, error } = await supabase
    .from("service_items")
    .insert({
      workspace_id: workspaceResult.workspaceId,
      service_id: serviceId,
      project_id: targetType === "project" ? targetId : null,
      billing_record_id: targetType === "billing_record" ? targetId : null,
      name: service.name,
      description: service.description,
      deliverables: service.deliverables || [],
      pricing_type: service.pricing_type || "fixed",
      quantity: 1,
      unit_price_cents: service.base_price_cents ?? null,
      total_price_cents: service.base_price_cents ?? null,
      currency: service.currency || "USD",
      hours_estimate: null,
      hourly_rate_cents: service.pricing_type === "hourly" ? service.base_price_cents : null,
      billing_interval: service.billing_interval ?? null,
      hours_included: service.hours_included ?? null,
      sort_order: 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Create service item from service error:", error)
    return { success: false, error: "Failed to create service item" }
  }

  if (targetType === "project") {
    revalidatePath(`/work/${targetId}`)
  }

  return { success: true, data: data as ServiceItem }
}

export async function updateServiceItem(input: UpdateServiceItemInput): Promise<{
  success: boolean
  data?: ServiceItem
  error?: string
}> {
  const supabase = await createClient()
  const workspaceResult = await getWorkspaceId()

  if ("error" in workspaceResult) {
    return { success: false, error: workspaceResult.error }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.deliverables !== undefined) updates.deliverables = input.deliverables
  if (input.pricing_type !== undefined) updates.pricing_type = input.pricing_type
  if (input.quantity !== undefined) updates.quantity = input.quantity
  if (input.unit_price_cents !== undefined) updates.unit_price_cents = input.unit_price_cents
  if (input.total_price_cents !== undefined) updates.total_price_cents = input.total_price_cents
  if (input.hours_estimate !== undefined) updates.hours_estimate = input.hours_estimate
  if (input.hours_used !== undefined) updates.hours_used = input.hours_used
  if (input.hourly_rate_cents !== undefined) updates.hourly_rate_cents = input.hourly_rate_cents
  if (input.billing_interval !== undefined) updates.billing_interval = input.billing_interval
  if (input.hours_included !== undefined) updates.hours_included = input.hours_included
  if (input.deliverables_completed !== undefined) updates.deliverables_completed = input.deliverables_completed
  if (input.completed_at !== undefined) updates.completed_at = input.completed_at
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order

  const { data, error } = await supabase
    .from("service_items")
    .update(updates)
    .eq("id", input.id)
    .eq("workspace_id", workspaceResult.workspaceId)
    .select()
    .single()

  if (error) {
    console.error("Update service item error:", error)
    return { success: false, error: "Failed to update service item" }
  }

  const item = data as ServiceItem
  if (item.project_id) {
    revalidatePath(`/work/${item.project_id}`)
  }

  return { success: true, data: item }
}

export async function deleteServiceItem(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const workspaceResult = await getWorkspaceId()

  if ("error" in workspaceResult) {
    return { success: false, error: workspaceResult.error }
  }

  const { data: existing } = await supabase
    .from("service_items")
    .select("project_id")
    .eq("id", id)
    .eq("workspace_id", workspaceResult.workspaceId)
    .single()

  const { error } = await supabase
    .from("service_items")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceResult.workspaceId)

  if (error) {
    console.error("Delete service item error:", error)
    return { success: false, error: "Failed to delete service item" }
  }

  if (existing?.project_id) {
    revalidatePath(`/work/${existing.project_id}`)
  }

  return { success: true }
}

export async function getServiceItemsForWork(projectId: string): Promise<{
  success: boolean
  data?: ServiceItem[]
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Get service items error:", error)
    return { success: false, error: "Failed to get service items" }
  }

  return { success: true, data: data as ServiceItem[] }
}

export async function getServiceItemsForBilling(billingRecordId: string): Promise<{
  success: boolean
  data?: ServiceItem[]
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .eq("billing_record_id", billingRecordId)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Get service items error:", error)
    return { success: false, error: "Failed to get service items" }
  }

  return { success: true, data: data as ServiceItem[] }
}

export async function logHoursToServiceItem(
  id: string,
  hours: number
): Promise<{
  success: boolean
  data?: ServiceItem
  error?: string
}> {
  const supabase = await createClient()
  const workspaceResult = await getWorkspaceId()

  if ("error" in workspaceResult) {
    return { success: false, error: workspaceResult.error }
  }

  const { data: existing, error: fetchError } = await supabase
    .from("service_items")
    .select("hours_used")
    .eq("id", id)
    .eq("workspace_id", workspaceResult.workspaceId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: "Service item not found" }
  }

  const newHours = (existing.hours_used || 0) + hours

  const { data, error } = await supabase
    .from("service_items")
    .update({ hours_used: newHours })
    .eq("id", id)
    .eq("workspace_id", workspaceResult.workspaceId)
    .select()
    .single()

  if (error) {
    console.error("Log hours error:", error)
    return { success: false, error: "Failed to log hours" }
  }

  const item = data as ServiceItem
  if (item.project_id) {
    revalidatePath(`/work/${item.project_id}`)
  }

  return { success: true, data: item }
}

export async function markDeliverableComplete(
  id: string
): Promise<{
  success: boolean
  data?: ServiceItem
  error?: string
}> {
  const supabase = await createClient()
  const workspaceResult = await getWorkspaceId()

  if ("error" in workspaceResult) {
    return { success: false, error: workspaceResult.error }
  }

  const { data: existing, error: fetchError } = await supabase
    .from("service_items")
    .select("deliverables_completed, deliverables")
    .eq("id", id)
    .eq("workspace_id", workspaceResult.workspaceId)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: "Service item not found" }
  }

  const newCount = (existing.deliverables_completed || 0) + 1
  const totalDeliverables = existing.deliverables?.length || 0
  const isComplete = totalDeliverables > 0 && newCount >= totalDeliverables

  const { data, error } = await supabase
    .from("service_items")
    .update({
      deliverables_completed: newCount,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceResult.workspaceId)
    .select()
    .single()

  if (error) {
    console.error("Mark deliverable complete error:", error)
    return { success: false, error: "Failed to mark deliverable complete" }
  }

  const item = data as ServiceItem
  if (item.project_id) {
    revalidatePath(`/work/${item.project_id}`)
  }

  return { success: true, data: item }
}
