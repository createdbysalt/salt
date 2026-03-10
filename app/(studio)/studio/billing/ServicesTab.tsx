"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  List,
  Grid2x2,
  Upload,
  Download,
  SlidersHorizontal,
  Settings2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  RotateCcw,
  Check,
  Tag,
  DollarSign,
  Cloud,
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
  Separator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Checkbox,
} from "@repo/ui"
import {
  useStudioServices,
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
  type VisibilityState,
  type SortingState,
  type RowSelectionState,
  type ViewFilter,
} from "@/app/_features/services/components/ServicesDataTable"
import type { StudioService } from "@/app/_features/services/types"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = "table" | "grid"
type SortDirection = "asc" | "desc"

interface ActiveFilter {
  filterId: string
  values: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DISPLAY_PROPERTIES = [
  { id: "category", label: "Category" },
  { id: "pricingType", label: "Type" },
  { id: "pricing", label: "Price" },
  { id: "syncStatus", label: "Sync" },
  { id: "timeline", label: "Timeline" },
] as const

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "updatedAt", label: "Updated" },
  { value: "createdAt", label: "Created" },
  { value: "price", label: "Price" },
  { value: "category", label: "Category" },
] as const

const FILTER_OPTIONS = [
  {
    id: "category",
    label: "Category",
    icon: Tag,
    options: [], // Will be populated dynamically
  },
  {
    id: "pricingType",
    label: "Pricing Type",
    icon: DollarSign,
    options: [
      { value: "fixed", label: "Fixed" },
      { value: "hourly", label: "Hourly" },
      { value: "retainer", label: "Retainer" },
      { value: "custom", label: "Custom" },
    ],
  },
  {
    id: "syncStatus",
    label: "Sync Status",
    icon: Cloud,
    options: [
      { value: "synced", label: "Synced" },
      { value: "not_synced", label: "Not Synced" },
      { value: "pending", label: "Pending" },
      { value: "sync_error", label: "Sync Error" },
    ],
  },
] as const

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  category: true,
  pricingType: true,
  pricing: true,
  syncStatus: true,
  timeline: false,
}

// ============================================================================
// TOOLBAR COMPONENTS
// ============================================================================

function ToolbarButton({
  children,
  className,
  onClick,
  active,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 text-xs",
        "hover:text-foreground transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

function DisplayDropdown({
  viewMode,
  onViewModeChange,
  sortField,
  sortDirection,
  onSortChange,
  columnVisibility,
  onColumnVisibilityChange,
  onReset,
}: {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  sortField: string
  sortDirection: SortDirection
  onSortChange: (field: string, direction: SortDirection) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (visibility: VisibilityState) => void
  onReset: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground",
            "hover:text-foreground transition-colors"
          )}
        >
          <Settings2 className="size-3.5" />
          Display
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        {/* View Mode Switcher */}
        <div className="p-3 pb-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => onViewModeChange("table")}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-4" />
              List
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid2x2 className="size-4" />
              Cards
            </button>
          </div>
        </div>

        <div className="p-3 space-y-4">
          <Separator />

          {/* Ordering */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Ordering</p>
            <div className="flex items-center gap-2">
              <Select
                value={sortField}
                onValueChange={(v) => onSortChange(v, sortDirection)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() =>
                  onSortChange(sortField, sortDirection === "asc" ? "desc" : "asc")
                }
              >
                {sortDirection === "asc" ? (
                  <ArrowUp className="size-3.5" />
                ) : (
                  <ArrowDown className="size-3.5" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Display Properties - Only for table view */}
          <div
            className={cn(
              "space-y-2",
              viewMode !== "table" && "opacity-40 pointer-events-none"
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">
              Display properties
              {viewMode !== "table" && (
                <span className="ml-1 text-[10px]">(List view only)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DISPLAY_PROPERTIES.map((prop) => {
                const isVisible = columnVisibility[prop.id] !== false
                return (
                  <button
                    key={prop.id}
                    disabled={viewMode !== "table"}
                    onClick={() =>
                      onColumnVisibilityChange({
                        ...columnVisibility,
                        [prop.id]: !isVisible,
                      })
                    }
                    className={cn(
                      "px-2 py-1 text-xs rounded-md border transition-colors",
                      isVisible
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                    )}
                  >
                    {prop.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="p-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={onReset} className="text-xs gap-1.5">
            <RotateCcw className="size-3" />
            Reset to default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilterDropdown({
  activeFilters,
  onFilterToggle,
  onClearFilters,
  categories,
}: {
  activeFilters: ActiveFilter[]
  onFilterToggle: (filterId: string, value: string) => void
  onClearFilters: () => void
  categories: string[]
}) {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)

  const getFilterValues = (filterId: string): string[] => {
    return activeFilters.find((f) => f.filterId === filterId)?.values ?? []
  }

  const totalFilterCount = activeFilters.reduce((sum, f) => sum + f.values.length, 0)

  // Build filter options with dynamic categories
  const filterOptionsWithCategories = FILTER_OPTIONS.map((filter) => {
    if (filter.id === "category") {
      return {
        ...filter,
        options: categories.map((cat) => ({ value: cat, label: cat })),
      }
    }
    return filter
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 text-xs",
            "hover:text-foreground transition-colors",
            totalFilterCount > 0 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filter
          {totalFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-foreground text-background rounded-full">
              {totalFilterCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        {selectedFilter === null ? (
          <Command>
            <CommandInput placeholder="Filter by..." className="h-9" />
            <CommandList>
              <CommandEmpty>No filters found.</CommandEmpty>
              <CommandGroup>
                {filterOptionsWithCategories.map((filter) => {
                  const Icon = filter.icon
                  const currentValues = getFilterValues(filter.id)
                  return (
                    <CommandItem
                      key={filter.id}
                      onSelect={() => setSelectedFilter(filter.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span>{filter.label}</span>
                      </div>
                      {currentValues.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {currentValues.length === 1
                            ? filter.options.find((o) => o.value === currentValues[0])
                                ?.label
                            : `${currentValues.length} selected`}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {totalFilterCount > 0 && (
                <>
                  <Separator className="my-1" />
                  <CommandGroup>
                    <CommandItem
                      onSelect={onClearFilters}
                      className="justify-center text-muted-foreground"
                    >
                      Clear all filters
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        ) : (
          <div>
            <div className="flex items-center gap-2 p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFilter(null)}
                className="h-7 px-2"
              >
                <ArrowLeft className="size-3.5" />
              </Button>
              <span className="text-sm font-medium">
                {filterOptionsWithCategories.find((f) => f.id === selectedFilter)?.label}
              </span>
            </div>
            <div className="p-1">
              {filterOptionsWithCategories
                .find((f) => f.id === selectedFilter)
                ?.options.map((option) => {
                  const isSelected = getFilterValues(selectedFilter).includes(option.value)
                  return (
                    <button
                      key={option.value}
                      onClick={() => onFilterToggle(selectedFilter, option.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                        "hover:bg-accent transition-colors",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center",
                          isSelected ? "bg-foreground border-foreground" : "border-border"
                        )}
                      >
                        {isSelected && <Check className="size-3 text-background" />}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

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

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewFilter, setViewFilter] = useState<ViewFilter>("active")
  const [selectedService, setSelectedService] = useState<StudioService | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isBulkActioning, setIsBulkActioning] = useState(false)

  // Sort state
  const [sortField, setSortField] = useState("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [sorting, setSorting] = useState<SortingState>([])

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )

  // Filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])

  // Row selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Extract unique categories
  const categories = [...new Set(services.map((s) => s.category || "Uncategorized"))]

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

  const handleSortChange = (field: string, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
    setSorting([{ id: field, desc: direction === "desc" }])
  }

  const handleFilterToggle = (filterId: string, value: string) => {
    setActiveFilters((prev) => {
      const existing = prev.find((f) => f.filterId === filterId)
      if (existing) {
        const hasValue = existing.values.includes(value)
        if (hasValue) {
          const newValues = existing.values.filter((v) => v !== value)
          if (newValues.length === 0) {
            return prev.filter((f) => f.filterId !== filterId)
          }
          return prev.map((f) =>
            f.filterId === filterId ? { ...f, values: newValues } : f
          )
        } else {
          return prev.map((f) =>
            f.filterId === filterId ? { ...f, values: [...f.values, value] } : f
          )
        }
      } else {
        return [...prev, { filterId, values: [value] }]
      }
    })
  }

  const handleResetDisplay = () => {
    setViewMode("table")
    setSortField("name")
    setSortDirection("asc")
    setSorting([])
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)
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

    // Active filters
    for (const filter of activeFilters) {
      const { filterId, values } = filter
      let matchesAny = false

      for (const value of values) {
        switch (filterId) {
          case "category":
            if ((s.category || "Uncategorized") === value) matchesAny = true
            break
          case "pricingType":
            if (s.pricing_type === value) matchesAny = true
            break
          case "syncStatus":
            if (s.stripe_sync_status === value) matchesAny = true
            break
        }
      }

      if (!matchesAny) return false
    }

    return true
  })

  // Sort services (for grid view - table handles its own sorting)
  if (viewMode === "grid") {
    filteredServices = [...filteredServices].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "updatedAt":
          comparison =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
        case "createdAt":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "price":
          comparison = (a.price_min || 0) - (b.price_min || 0)
          break
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "")
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
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
          <div className="flex items-center gap-0.5 border-b px-4 py-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-72 rounded-md bg-muted/50 pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* View Filter (Active/Archived/Deleted) */}
            <div className="ml-3">
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
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Actions */}
            <ToolbarButton>
              <Upload className="size-3.5" />
              Import
            </ToolbarButton>
            <ToolbarButton>
              <Download className="size-3.5" />
              Export
            </ToolbarButton>

            <FilterDropdown
              activeFilters={activeFilters}
              onFilterToggle={handleFilterToggle}
              onClearFilters={() => setActiveFilters([])}
              categories={categories}
            />

            <DisplayDropdown
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              onReset={handleResetDisplay}
            />

            {/* Add Service Button - only in active view */}
            {viewFilter === "active" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 ml-2"
                onClick={() => setIsCreatingNew(true)}
              >
                <Plus className="size-3.5" />
                Add Service
              </Button>
            )}
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
                searchQuery=""
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                sorting={sorting}
                onSortingChange={setSorting}
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
