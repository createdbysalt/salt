"use client"

import { useState } from "react"
import { Plus, Search, LayoutGrid, List, Loader2 } from "lucide-react"
import { cn } from "@repo/utils"
import { Button, Badge, Skeleton } from "@repo/ui"
import { useStudioServices, formatPrice, formatSyncStatus } from "@/app/_features/services/hooks/useStudioServices"
import { seedDefaultServices } from "@/app/_features/services/actions"
import { ServiceFormDialog } from "./ServiceFormDialog"
import type { StudioService } from "@/app/_features/services/types"
import { toast } from "sonner"

type ViewMode = "grid" | "list"

function ServiceCard({
  service,
  onClick,
}: {
  service: StudioService
  onClick: () => void
}) {
  const syncStatus = formatSyncStatus(service.stripe_sync_status)
  const priceDisplay = formatPrice(service.price_min, service.price_max, service.pricing_type, service.currency)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border bg-card transition-colors",
        "hover:border-foreground/20 hover:bg-accent/50",
        !service.is_active && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-medium text-sm truncate">{service.name}</h3>
          {!service.is_active && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Inactive
            </Badge>
          )}
        </div>
        <Badge variant={syncStatus.variant} className="text-[10px] px-1.5 py-0 shrink-0">
          {syncStatus.label}
        </Badge>
      </div>

      {service.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{service.category || "Uncategorized"}</span>
        <span className="font-medium">{priceDisplay}</span>
      </div>
    </button>
  )
}

function ServiceListItem({
  service,
  onClick,
}: {
  service: StudioService
  onClick: () => void
}) {
  const syncStatus = formatSyncStatus(service.stripe_sync_status)
  const priceDisplay = formatPrice(service.price_min, service.price_max, service.pricing_type, service.currency)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b transition-colors",
        "hover:bg-accent/50",
        !service.is_active && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{service.name}</h3>
            {!service.is_active && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Inactive
              </Badge>
            )}
          </div>
          {service.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{service.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs shrink-0">
          <span className="text-muted-foreground w-24">{service.category || "Uncategorized"}</span>
          <span className="font-medium w-28 text-right">{priceDisplay}</span>
          <Badge variant={syncStatus.variant} className="text-[10px] px-1.5 py-0 w-20 justify-center">
            {syncStatus.label}
          </Badge>
        </div>
      </div>
    </button>
  )
}

function EmptyState({ onSeedDefaults, isSeeding }: { onSeedDefaults: () => void; isSeeding: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">No services yet</h3>
      <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
        Create your service catalog to track offerings, set pricing, and sync with Stripe.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSeedDefaults} disabled={isSeeding}>
          {isSeeding && <Loader2 className="size-3 mr-1.5 animate-spin" />}
          Use Templates
        </Button>
        <ServiceFormDialog
          trigger={
            <Button size="sm">
              <Plus className="size-3 mr-1.5" />
              Create Service
            </Button>
          }
        />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border bg-card">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full mb-3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ServicesTab() {
  const { services, grouped, stats, isLoading, error, mutate } = useStudioServices()
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedService, setSelectedService] = useState<StudioService | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeedDefaults = async () => {
    setIsSeeding(true)
    const result = await seedDefaultServices()
    setIsSeeding(false)

    if (result.success) {
      toast.success("Default services added!")
      mutate()
    } else {
      toast.error(result.error || "Failed to add default services")
    }
  }

  // Filter services based on search
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group filtered services by category
  const filteredGrouped: { category: string; services: StudioService[] }[] = []
  const categoryMap = new Map<string, StudioService[]>()

  for (const service of filteredServices) {
    const category = service.category || "Uncategorized"
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(service)
  }

  for (const [category, svcs] of categoryMap) {
    filteredGrouped.push({ category, services: svcs })
  }

  // Sort groups alphabetically
  filteredGrouped.sort((a, b) => a.category.localeCompare(b.category))

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <p className="text-sm">Error loading services</p>
      </div>
    )
  }

  if (services.length === 0) {
    return <EmptyState onSeedDefaults={handleSeedDefaults} isSeeding={isSeeding} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-md bg-muted/50 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{stats.total} services</span>
          <span className="text-border">|</span>
          <span>{stats.active} active</span>
        </div>

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded transition-colors",
              viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-3.5" />
          </button>
        </div>

        <ServiceFormDialog
          trigger={
            <Button size="sm">
              <Plus className="size-3 mr-1.5" />
              Service
            </Button>
          }
          onSuccess={() => mutate()}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {filteredServices.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No services match your search</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="p-4 space-y-6">
            {filteredGrouped.map((group) => (
              <div key={group.category}>
                <h2 className="text-xs font-medium text-muted-foreground mb-3 px-1">
                  {group.category}
                  <span className="ml-2 text-muted-foreground/60">({group.services.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onClick={() => setSelectedService(service)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t">
            {filteredGrouped.map((group) => (
              <div key={group.category}>
                <div className="px-4 py-2 bg-muted/30 border-b">
                  <h2 className="text-xs font-medium text-muted-foreground">
                    {group.category}
                    <span className="ml-2 text-muted-foreground/60">({group.services.length})</span>
                  </h2>
                </div>
                {group.services.map((service) => (
                  <ServiceListItem
                    key={service.id}
                    service={service}
                    onClick={() => setSelectedService(service)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {selectedService && (
        <ServiceFormDialog
          service={selectedService}
          open={!!selectedService}
          onOpenChange={(open) => !open && setSelectedService(null)}
          onSuccess={() => {
            setSelectedService(null)
            mutate()
          }}
        />
      )}
    </div>
  )
}
