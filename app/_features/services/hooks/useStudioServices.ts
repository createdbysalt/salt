"use client"

import useSWR from "swr"
import { getServices, getServiceCategories, seedDefaultServiceCategories } from "../actions"
import type { StudioService, ServiceGroup, ServiceCategory } from "../types"

export function useStudioServices() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-services",
    async () => {
      const result = await getServices()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    {
      revalidateOnFocus: false,
    }
  )

  // Group services by category
  const grouped: ServiceGroup[] = []
  const categoryMap = new Map<string, StudioService[]>()

  if (data) {
    for (const service of data) {
      const category = service.category || "Uncategorized"
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(service)
    }

    for (const [category, services] of categoryMap) {
      grouped.push({ category, services })
    }
  }

  // Separate active and inactive
  const activeServices = data?.filter((s) => s.is_active) ?? []
  const inactiveServices = data?.filter((s) => !s.is_active) ?? []

  // Stats
  const stats = {
    total: data?.length ?? 0,
    active: activeServices.length,
    inactive: inactiveServices.length,
    synced: data?.filter((s) => s.stripe_sync_status === "synced").length ?? 0,
    notSynced: data?.filter((s) => s.stripe_sync_status === "not_synced").length ?? 0,
    categories: grouped.length,
  }

  return {
    services: data ?? [],
    activeServices,
    inactiveServices,
    grouped,
    stats,
    isLoading,
    error,
    mutate,
  }
}

// Format price for display
export function formatPrice(
  priceMin: number | null,
  priceMax: number | null,
  pricingType: string | null,
  currency: string = "USD"
): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  if (!priceMin && !priceMax) {
    return "Custom pricing"
  }

  const suffix = pricingType === "hourly" ? "/hr" : pricingType === "retainer" ? "/mo" : ""

  if (priceMin && priceMax && priceMin !== priceMax) {
    return `${formatter.format(priceMin)} - ${formatter.format(priceMax)}${suffix}`
  }

  if (priceMin) {
    return `${formatter.format(priceMin)}${suffix}`
  }

  if (priceMax) {
    return `Up to ${formatter.format(priceMax)}${suffix}`
  }

  return "Custom pricing"
}

// Format sync status for display
export function formatSyncStatus(status: string | null): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  switch (status) {
    case "synced":
      return { label: "Synced", variant: "outline" }
    case "pending":
      return { label: "Syncing...", variant: "secondary" }
    case "sync_error":
      return { label: "Sync Error", variant: "destructive" }
    case "not_synced":
    default:
      return { label: "Not synced", variant: "destructive" }
  }
}

// Hook for service categories
export function useServiceCategories() {
  const { data, error, isLoading, mutate } = useSWR<ServiceCategory[]>(
    "service-categories",
    async () => {
      const result = await getServiceCategories()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    {
      revalidateOnFocus: false,
    }
  )

  // Seed defaults if no categories exist (auto-seed on first load)
  const seedDefaults = async () => {
    const result = await seedDefaultServiceCategories()
    if (result.success && result.data) {
      mutate(result.data, false)
    }
    return result
  }

  return {
    categories: data ?? [],
    isLoading,
    error,
    mutate,
    seedDefaults,
  }
}
