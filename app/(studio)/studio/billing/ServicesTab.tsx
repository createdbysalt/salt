"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  List,
  Grid2x2,
  Loader2,
  X,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import { cn } from "@repo/utils"
import {
  Button,
  Badge,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@repo/ui"
import {
  useStudioServices,
  useServiceCategories,
  formatPrice,
  formatSyncStatus,
} from "@/app/_features/services/hooks/useStudioServices"
import {
  seedDefaultServices,
  bulkArchiveServices,
  bulkUnarchiveServices,
  bulkTrashServices,
  bulkRestoreServices,
  bulkPermanentlyDeleteServices,
} from "@/app/_features/services/actions"
import { ServiceDetailPanel } from "@/app/_features/services/components/ServiceDetailPanel"
import {
  ServicesDataTable,
  type RowSelectionState,
  type ViewFilter,
} from "@/app/_features/services/components/ServicesDataTable"
import type { StudioService } from "@/app/_features/services/types"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = "table" | "grid"

// ============================================================================
// GRID COMPONENT
// ============================================================================

function ServiceCard({
  service,
  selected,
  onSelect,
  onClick,
}: {
  service: StudioService
  selected: boolean
  onSelect: () => void
  onClick: () => void
}) {
  const priceDisplay = formatPrice(
    service.price_min,
    service.price_max,
    service.pricing_type,
    service.currency
  )

  // Sync status styling matching Projects Health badge pattern
  const getSyncDisplay = () => {
    const status = service.stripe_sync_status
    if (status === "not_synced" || !status) {
      return { dotClass: "bg-destructive", label: "Not synced" }
    }
    if (status === "sync_error") {
      return { dotClass: "bg-destructive", label: "Sync Error" }
    }
    if (status === "synced") {
      return { dotClass: "bg-muted-foreground", label: "Synced" }
    }
    if (status === "pending") {
      return { dotClass: "bg-amber-500", label: "Syncing..." }
    }
    return { dotClass: "bg-muted-foreground", label: "—" }
  }

  const syncDisplay = getSyncDisplay()

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-5 hover:bg-muted/50 transition-colors",
        selected && "ring-2 ring-primary",
        !service.is_active && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <div className="absolute top-3 left-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="size-4"
        />
      </div>

      <button onClick={onClick} className="w-full text-left">
        {/* Top: Avatar + Name + Category */}
        <div className="flex items-start gap-3 pl-6">
          <div className="size-10 shrink-0 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium">
              {service.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{service.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {service.category || "Uncategorized"}
            </p>
          </div>
        </div>

        {/* Bottom: Status + Value */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", syncDisplay.dotClass)} />
            <span>{syncDisplay.label}</span>
          </div>
          {priceDisplay !== "Custom pricing" && (
            <span className="text-sm font-medium">{priceDisplay}</span>
          )}
        </div>
      </button>
    </div>
  )
}

// ============================================================================
// BULK ACTION BAR
// ============================================================================

function ServicesBulkActionBar({
  selectedCount,
  viewFilter,
  isLoading,
  onClearSelection,
  onArchive,
  onUnarchive,
  onTrash,
  onRestore,
  onDeleteForever,
}: {
  selectedCount: number
  viewFilter: ViewFilter
  isLoading: boolean
  onClearSelection: () => void
  onArchive: () => void
  onUnarchive: () => void
  onTrash: () => void
  onRestore: () => void
  onDeleteForever: () => void
}) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        "fixed bottom-6 z-50",
        "left-[calc(50%+var(--sidebar-width,16rem)/2)] -translate-x-1/2",
        "bg-background border shadow-lg rounded-lg",
        "flex items-center gap-2 px-4 py-2",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200"
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Context-aware actions */}
      {viewFilter === "active" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onArchive}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Archive className="size-4" />
            )}
            Archive
          </Button>

          <div className="pl-2 border-l">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onTrash}
              disabled={isLoading}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </>
      )}

      {viewFilter === "archived" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onUnarchive}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArchiveRestore className="size-4" />
            )}
            Unarchive
          </Button>

          <div className="pl-2 border-l">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onTrash}
              disabled={isLoading}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </>
      )}

      {viewFilter === "deleted" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onRestore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArchiveRestore className="size-4" />
            )}
            Restore
          </Button>

          <div className="pl-2 border-l">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDeleteForever}
              disabled={isLoading}
            >
              <Trash2 className="size-4" />
              Delete Forever
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// EMPTY & LOADING STATES
// ============================================================================

function EmptyState({
  onSeedDefaults,
  onCreateNew,
  isSeeding,
}: {
  onSeedDefaults: () => void
  onCreateNew: () => void
  isSeeding: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">No services yet</h3>
      <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
        Create your service catalog to track offerings, set pricing, and sync with
        Stripe.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSeedDefaults} disabled={isSeeding}>
          {isSeeding && <Loader2 className="size-3 mr-1.5 animate-spin" />}
          Use Templates
        </Button>
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="size-3 mr-1.5" />
          Create Service
        </Button>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-4">
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b">
            <Skeleton className="size-4" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ServicesTab() {
  const { services, stats, isLoading, error, mutate } = useStudioServices()
  const { categories, isLoading: categoriesLoading } = useServiceCategories()

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewFilter, setViewFilter] = useState<ViewFilter>("active")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedService, setSelectedService] = useState<StudioService | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isBulkActioning, setIsBulkActioning] = useState(false)

  // Row selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Handlers
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

  const handleSelectRow = (id: string) => {
    setRowSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const clearSelection = () => setRowSelection({})

  // Filter services based on view filter (active/archived/deleted)
  let filteredServices = services.filter((s) => {
    // View filter (archive/delete state)
    switch (viewFilter) {
      case "active":
        if (s.archived_at || s.deleted_at) return false
        break
      case "archived":
        if (!s.archived_at || s.deleted_at) return false
        break
      case "deleted":
        if (!s.deleted_at) return false
        break
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = s.name.toLowerCase().includes(query)
      const matchesDesc = s.description?.toLowerCase().includes(query)
      const matchesCat = s.category?.toLowerCase().includes(query)
      if (!matchesName && !matchesDesc && !matchesCat) return false
    }

    // Category filter
    if (categoryFilter !== "all") {
      if (categoryFilter === "uncategorized") {
        // Show only services without a category
        if (s.category_id) return false
      } else {
        // Match by category_id
        if (s.category_id !== categoryFilter) return false
      }
    }

    return true
  })

  // Sort by name for grid view (table handles its own sorting)
  if (viewMode === "grid") {
    filteredServices = [...filteredServices].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length

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
    return (
      <EmptyState
        onSeedDefaults={handleSeedDefaults}
        onCreateNew={() => setIsCreatingNew(true)}
        isSeeding={isSeeding}
      />
    )
  }

  // Show panel when creating new or viewing selected
  const showPanel = isCreatingNew || selectedService !== null

  const handleClosePanel = () => {
    setSelectedService(null)
    setIsCreatingNew(false)
  }

  const handleRowClick = (service: StudioService) => {
    setIsCreatingNew(false)
    setSelectedService(service)
  }

  return (
    <>
      <div className="flex h-full">
        {/* Left Side - Toolbar + Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-64 rounded-md bg-muted/50 pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* View Filter (Active/Archived/Deleted) */}
            <Select
              value={viewFilter}
              onValueChange={(v) => {
                setViewFilter(v as ViewFilter)
                setRowSelection({}) // Clear selection when changing views
                handleClosePanel()
              }}
            >
              <SelectTrigger className="!h-7 w-24 !py-0 text-xs border-none bg-muted/50 hover:bg-muted rounded-md shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="text-xs">
                  Active
                </SelectItem>
                <SelectItem value="archived" className="text-xs">
                  Archived
                </SelectItem>
                <SelectItem value="deleted" className="text-xs">
                  Deleted
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="!h-7 w-32 !py-0 text-xs border-none bg-muted/50 hover:bg-muted rounded-md shadow-none">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Categories
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="uncategorized" className="text-xs text-muted-foreground">
                    Uncategorized
                  </SelectItem>
                  <div className="border-t my-1" />
                  <a
                    href="/studio/settings/services"
                    className="flex items-center px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit Categories
                  </a>
                </SelectContent>
              </Select>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center justify-center size-7 rounded transition-colors",
                  viewMode === "table"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center justify-center size-7 rounded transition-colors",
                  viewMode === "grid"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid2x2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {filteredServices.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No services match your filters</p>
              </div>
            ) : viewMode === "table" ? (
              <ServicesDataTable
                data={filteredServices}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onEditService={handleRowClick}
                viewFilter={viewFilter}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    selected={rowSelection[service.id] || false}
                    onSelect={() => handleSelectRow(service.id)}
                    onClick={() => handleRowClick(service)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Detail Panel */}
        {showPanel && (
          <div className="w-[340px] shrink-0 border-l">
            <ServiceDetailPanel
              service={isCreatingNew ? null : selectedService}
              isNew={isCreatingNew}
              viewFilter={viewFilter}
              onClose={handleClosePanel}
              onSuccess={() => {
                mutate()
              }}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <ServicesBulkActionBar
        selectedCount={selectedCount}
        viewFilter={viewFilter}
        isLoading={isBulkActioning}
        onClearSelection={clearSelection}
        onArchive={async () => {
          const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
          if (selectedIds.length === 0) return
          setIsBulkActioning(true)
          const result = await bulkArchiveServices(selectedIds)
          setIsBulkActioning(false)
          if (result.success) {
            toast.success(`${selectedIds.length} service(s) archived`)
            clearSelection()
            mutate()
          } else {
            toast.error(result.error || "Failed to archive services")
          }
        }}
        onUnarchive={async () => {
          const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
          if (selectedIds.length === 0) return
          setIsBulkActioning(true)
          const result = await bulkUnarchiveServices(selectedIds)
          setIsBulkActioning(false)
          if (result.success) {
            toast.success(`${selectedIds.length} service(s) unarchived`)
            clearSelection()
            mutate()
          } else {
            toast.error(result.error || "Failed to unarchive services")
          }
        }}
        onTrash={async () => {
          const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
          if (selectedIds.length === 0) return
          setIsBulkActioning(true)
          const result = await bulkTrashServices(selectedIds)
          setIsBulkActioning(false)
          if (result.success) {
            toast.success(`${selectedIds.length} service(s) moved to trash`)
            clearSelection()
            mutate()
          } else {
            toast.error(result.error || "Failed to move services to trash")
          }
        }}
        onRestore={async () => {
          const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
          if (selectedIds.length === 0) return
          setIsBulkActioning(true)
          const result = await bulkRestoreServices(selectedIds)
          setIsBulkActioning(false)
          if (result.success) {
            toast.success(`${selectedIds.length} service(s) restored`)
            clearSelection()
            mutate()
          } else {
            toast.error(result.error || "Failed to restore services")
          }
        }}
        onDeleteForever={async () => {
          const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
          if (selectedIds.length === 0) return
          setIsBulkActioning(true)
          const result = await bulkPermanentlyDeleteServices(selectedIds)
          setIsBulkActioning(false)
          if (result.success) {
            toast.success(`${selectedIds.length} service(s) permanently deleted`)
            clearSelection()
            mutate()
          } else {
            toast.error(result.error || "Failed to delete services")
          }
        }}
      />
    </>
  )
}
