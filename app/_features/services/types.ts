export type PricingType = "fixed" | "hourly" | "retainer" | "custom"
export type ServiceItemPricingType = "fixed" | "hourly" | "retainer" | "milestone"
export type BillingInterval = "monthly" | "quarterly" | "annually"
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD"

// Legacy - kept for backward compatibility, will be removed
export type StripeSyncStatus = "not_synced" | "synced" | "sync_error" | "pending"

// Service Categories (studio-scoped)
export interface ServiceCategory {
  id: string
  workspace_id: string
  name: string
  color: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateServiceCategoryInput {
  name: string
  color?: string
  sort_order?: number
}

export interface UpdateServiceCategoryInput {
  id: string
  name?: string
  color?: string
  sort_order?: number
}

// Default categories seeded per-studio
export const DEFAULT_SERVICE_CATEGORIES = [
  { name: "Design" },
  { name: "Development" },
  { name: "Strategy" },
  { name: "Consulting" },
  { name: "Support" },
  { name: "Marketing" },
] as const

export interface StudioService {
  id: string
  workspace_id: string
  name: string
  description: string | null
  category: string | null // Legacy free-text (deprecated)
  category_id: string | null // New: FK to service_categories
  pricing_type: PricingType | null
  price_min: number | null
  price_max: number | null
  currency: Currency
  deliverables: string[]
  typical_timeline: string | null
  ai_description: string | null
  display_order: number
  is_active: boolean
  // Retainer-specific fields (used when pricing_type === 'retainer')
  hours_included: number | null
  response_time: string | null
  rollover_hours: number | null
  billing_interval: "monthly" | "quarterly" | "annually"
  is_recommended: boolean
  services_included: string[]
  // Stripe sync (Phase 2)
  stripe_product_id: string | null
  stripe_price_id: string | null
  stripe_sync_status: StripeSyncStatus
  stripe_synced_at: string | null
  // Tag references
  feature_tag_ids: string[]
  deliverable_tag_ids: string[]
  // Archive/Delete
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateServiceInput {
  name: string
  description?: string
  category?: string // Legacy
  category_id?: string // New: FK to service_categories
  pricing_type?: PricingType
  price_min?: number
  price_max?: number
  currency?: Currency
  deliverables?: string[]
  typical_timeline?: string
  feature_tag_ids?: string[]
  deliverable_tag_ids?: string[]
  // Retainer-specific fields
  hours_included?: number
  response_time?: string
  rollover_hours?: number
  billing_interval?: "monthly" | "quarterly" | "annually"
  is_recommended?: boolean
  services_included?: string[]
}

export interface UpdateServiceInput {
  id: string
  name?: string
  description?: string
  category?: string // Legacy
  category_id?: string | null // New: FK to service_categories
  pricing_type?: PricingType
  price_min?: number
  price_max?: number
  currency?: Currency
  deliverables?: string[]
  typical_timeline?: string
  is_active?: boolean
  display_order?: number
  feature_tag_ids?: string[]
  deliverable_tag_ids?: string[]
  // Retainer-specific fields
  hours_included?: number | null
  response_time?: string | null
  rollover_hours?: number | null
  billing_interval?: "monthly" | "quarterly" | "annually"
  is_recommended?: boolean
  services_included?: string[]
}

export interface ServiceGroup {
  category: string
  services: StudioService[]
}

// Formatted for display
export interface ServiceDisplay extends StudioService {
  priceDisplay: string
  syncStatusDisplay: string
}

// ============================================================================
// SERVICE ITEMS - Instances of services on work/billing records
// ============================================================================

export interface ServiceItem {
  id: string
  workspace_id: string

  // Source template (nullable for ad-hoc items)
  service_id: string | null

  // Parent (one of these)
  project_id: string | null
  billing_record_id: string | null

  // Item details
  name: string
  description: string | null
  deliverables: string[]

  // Pricing
  pricing_type: ServiceItemPricingType
  quantity: number
  unit_price_cents: number | null
  total_price_cents: number | null
  currency: Currency

  // Hourly fields
  hours_estimate: number | null
  hours_used: number
  hourly_rate_cents: number | null

  // Retainer fields
  billing_interval: BillingInterval | null
  hours_included: number | null

  // Completion tracking
  deliverables_completed: number
  completed_at: string | null

  // Sort
  sort_order: number

  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateServiceItemInput {
  service_id?: string
  project_id?: string
  billing_record_id?: string
  name: string
  description?: string
  deliverables?: string[]
  pricing_type: ServiceItemPricingType
  quantity?: number
  unit_price_cents?: number
  total_price_cents?: number
  currency?: Currency
  hours_estimate?: number
  hourly_rate_cents?: number
  billing_interval?: BillingInterval
  hours_included?: number
  sort_order?: number
}

export interface UpdateServiceItemInput {
  id: string
  name?: string
  description?: string
  deliverables?: string[]
  pricing_type?: ServiceItemPricingType
  quantity?: number
  unit_price_cents?: number
  total_price_cents?: number
  hours_estimate?: number
  hours_used?: number
  hourly_rate_cents?: number
  billing_interval?: BillingInterval
  hours_included?: number
  deliverables_completed?: number
  completed_at?: string | null
  sort_order?: number
}
