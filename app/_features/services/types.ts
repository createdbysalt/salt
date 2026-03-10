export type PricingType = "fixed" | "hourly" | "retainer" | "custom"
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD"
export type StripeSyncStatus = "not_synced" | "synced" | "sync_error" | "pending"

export interface StudioService {
  id: string
  studio_id: string
  name: string
  description: string | null
  category: string | null
  pricing_type: PricingType | null
  price_min: number | null
  price_max: number | null
  currency: Currency
  deliverables: string[]
  typical_timeline: string | null
  ai_description: string | null
  display_order: number
  is_active: boolean
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
  category?: string
  pricing_type?: PricingType
  price_min?: number
  price_max?: number
  currency?: Currency
  deliverables?: string[]
  typical_timeline?: string
  feature_tag_ids?: string[]
  deliverable_tag_ids?: string[]
}

export interface UpdateServiceInput {
  id: string
  name?: string
  description?: string
  category?: string
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
