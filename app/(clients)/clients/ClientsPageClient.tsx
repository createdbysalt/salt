"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  Search as SearchIcon,
  Settings2,
  Search,
  List,
  Columns3,
  Grid2x2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  RotateCcw,
  Building2,
  CircleDot,
  Tag,
  DollarSign,
  FolderOpen,
  Clock,
  Calendar,
  Check,
  Plus,
  X,
  Archive,
  ArchiveRestore,
  Trash2,
  Settings,
  Eye,
  Users,
  ArchiveIcon,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Separator,
  SidebarTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { toast } from "sonner";
import {
  ClientsDataTable,
  ClientsGridView,
  ClientsBoardView,
  ClientsBulkActionBar,
  AddClientSheet,
  type Client,
  type VisibilityState,
  type SortingState,
  type RowSelectionState,
  type ClientCreateData,
} from "@/app/_features/clients/components";
import { createClientWithIntent } from "@/app/_features/clients/import-export-actions";
import {
  bulkArchiveClients,
  bulkUnarchiveClients,
  bulkTrashClients,
  bulkRestoreClients,
  bulkPermanentlyDeleteClients,
} from "@/app/actions/clients/bulk-actions";
import { removeFromFavorites } from "@/app/_features/shell/utils/favorites-storage";
import { removeFromAllRecents } from "@/app/_features/shell/utils/recents-storage";

// Display properties configuration
const DISPLAY_PROPERTIES = [
  { id: "company", label: "Company" },
  { id: "lifecycleStage", label: "Stage" },
  { id: "stageEnteredAt", label: "Days in Stage" },
  { id: "mrr", label: "MRR" },
  { id: "ltv", label: "LTV" },
  { id: "projectCount", label: "Projects" },
  { id: "lastContactAt", label: "Last Contact" },
  { id: "createdAt", label: "Created" },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Created" },
  { value: "mrr", label: "MRR" },
  { value: "lastContactAt", label: "Last Contact" },
  { value: "lifecycleStage", label: "Stage" },
] as const;

// Filter options
const FILTER_OPTIONS = [
  {
    id: "stage",
    label: "Stage",
    icon: CircleDot,
    options: [
      { value: "lead", label: "Inquiry" },
      { value: "discovery", label: "Discovery" },
      { value: "pitch", label: "Pitch" },
      { value: "active", label: "Client" },
      { value: "complete", label: "Complete" },
      { value: "on_hold", label: "On Hold" },
      { value: "lost", label: "Lost" },
    ],
  },
  {
    id: "company",
    label: "Company",
    icon: Building2,
    options: [
      { value: "has_company", label: "Has company" },
      { value: "no_company", label: "No company" },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    icon: Tag,
    options: [
      { value: "has_tags", label: "Has tags" },
      { value: "no_tags", label: "No tags" },
    ],
  },
  {
    id: "mrr",
    label: "MRR",
    icon: DollarSign,
    options: [
      { value: "has_mrr", label: "Has MRR" },
      { value: "no_mrr", label: "No MRR" },
      { value: "mrr_1k", label: "> $1,000" },
      { value: "mrr_5k", label: "> $5,000" },
    ],
  },
  {
    id: "ltv",
    label: "LTV",
    icon: DollarSign,
    options: [
      { value: "has_ltv", label: "Has LTV" },
      { value: "no_ltv", label: "No LTV" },
      { value: "ltv_5k", label: "> $5,000" },
      { value: "ltv_10k", label: "> $10,000" },
      { value: "ltv_25k", label: "> $25,000" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderOpen,
    options: [
      { value: "has_projects", label: "Has projects" },
      { value: "no_projects", label: "No projects" },
    ],
  },
  {
    id: "lastContact",
    label: "Last Contact",
    icon: Clock,
    options: [
      { value: "this_week", label: "This week" },
      { value: "this_month", label: "This month" },
      { value: "over_30_days", label: "Over 30 days" },
      { value: "never", label: "Never contacted" },
    ],
  },
  {
    id: "created",
    label: "Created",
    icon: Calendar,
    options: [
      { value: "today", label: "Today" },
      { value: "this_week", label: "This week" },
      { value: "this_month", label: "This month" },
      { value: "this_year", label: "This year" },
    ],
  },
] as const;

// Types
type ViewMode = "table" | "board" | "grid";
type SortDirection = "asc" | "desc";

interface ActiveFilter {
  filterId: string;
  values: string[];
}

// Toolbar button component
function ToolbarButton({
  children,
  className,
  onClick,
  active,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
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
  );
}

// Display Dropdown Component
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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortField: string;
  sortDirection: SortDirection;
  onSortChange: (field: string, direction: SortDirection) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  onReset: () => void;
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
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-lg">
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
              onClick={() => onViewModeChange("board")}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "board"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns3 className="size-4" />
              Board
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
              <Select value={sortField} onValueChange={(v) => onSortChange(v, sortDirection)}>
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
                onClick={() => onSortChange(sortField, sortDirection === "asc" ? "desc" : "asc")}
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
          <div className={cn("space-y-2", viewMode !== "table" && "opacity-40 pointer-events-none")}>
            <p className="text-xs font-medium text-muted-foreground">
              Display properties
              {viewMode !== "table" && <span className="ml-1 text-[10px]">(List view only)</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DISPLAY_PROPERTIES.map((prop) => {
                const isVisible = columnVisibility[prop.id] !== false;
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
                );
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
  );
}

// Filter Dropdown Component
function FilterDropdown({
  activeFilters,
  onFilterToggle,
  onClearFilters,
  variant = "default",
}: {
  activeFilters: ActiveFilter[];
  onFilterToggle: (filterId: string, value: string) => void;
  onClearFilters: () => void;
  variant?: "default" | "icon";
}) {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const getFilterValues = (filterId: string): string[] => {
    return activeFilters.find((f) => f.filterId === filterId)?.values ?? [];
  };

  const totalFilterCount = activeFilters.reduce((sum, f) => sum + f.values.length, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button size="icon" variant="secondary" className="size-8 relative">
            <SlidersHorizontal className="size-4" />
            {totalFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 text-[10px] bg-foreground text-background rounded-full flex items-center justify-center">
                {totalFilterCount}
              </span>
            )}
          </Button>
        ) : (
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
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        {selectedFilter === null ? (
          // Main filter list
          <Command>
            <CommandInput placeholder="Filter by..." className="h-9" />
            <CommandList>
              <CommandEmpty>No filters found.</CommandEmpty>
              <CommandGroup>
                {FILTER_OPTIONS.map((filter) => {
                  const Icon = filter.icon;
                  const currentValues = getFilterValues(filter.id);
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
                            ? filter.options.find((o) => o.value === currentValues[0])?.label
                            : `${currentValues.length} selected`}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {totalFilterCount > 0 && (
                <>
                  <Separator className="my-1" />
                  <CommandGroup>
                    <CommandItem onSelect={onClearFilters} className="justify-center text-muted-foreground">
                      Clear all filters
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        ) : (
          // Filter options (multi-select)
          <div>
            <div className="flex items-center gap-2 p-2 border-b">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFilter(null)} className="h-7 px-2">
                <ArrowLeft className="size-3.5" />
              </Button>
              <span className="text-sm font-medium">
                {FILTER_OPTIONS.find((f) => f.id === selectedFilter)?.label}
              </span>
            </div>
            <div className="p-1">
              {FILTER_OPTIONS.find((f) => f.id === selectedFilter)?.options.map((option) => {
                const isSelected = getFilterValues(selectedFilter).includes(option.value);
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
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// View filter type
type ClientViewFilter = "active" | "archived" | "deleted";

// View options configuration
const VIEW_OPTIONS = [
  { value: "active", label: "Active", icon: Users },
  { value: "archived", label: "Archived", icon: ArchiveIcon },
  { value: "deleted", label: "Deleted", icon: Trash2 },
] as const;

// View Dropdown Component
function ViewDropdown({
  value,
  onChange,
}: {
  value: ClientViewFilter;
  onChange: (value: ClientViewFilter) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="secondary" className="size-8">
          <Eye className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="space-y-0.5">
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                  "hover:bg-accent transition-colors",
                  isSelected && "bg-accent"
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="size-3.5 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Company type
interface Company {
  id: string;
  name: string;
}

// Props interface
interface ClientsPageClientProps {
  initialClients: Client[];
  currentView?: ClientViewFilter;
  companies: Company[];
}

// Default column visibility
const DEFAULT_VISIBILITY: VisibilityState = {
  company: true,
  lifecycleStage: true,
  stageEnteredAt: true,
  mrr: true,
  ltv: true,
  projectCount: true,
  lastContactAt: true,
  createdAt: true,
};

export function ClientsPageClient({
  initialClients,
  currentView = "active",
  companies,
}: ClientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Add Client Sheet state
  const [addClientSheetOpen, setAddClientSheetOpen] = useState(false);

  // Open sheet if ?new=true is in URL
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setAddClientSheetOpen(true);
      // Clean up the URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const newUrl = params.toString() ? `?${params.toString()}` : "/clients";
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  // View filter state (for UI, actual filtering happens server-side)
  const [viewFilter, setViewFilter] = useState<ClientViewFilter>(currentView);

  const handleViewFilterChange = (view: ClientViewFilter) => {
    setViewFilter(view);
    // Update URL to trigger server-side re-fetch
    const params = new URLSearchParams(searchParams.toString());
    if (view === "active") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const queryString = params.toString();
    router.push(queryString ? `/studio/clients?${queryString}` : "/studio/clients");
  };

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Sort state
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Bulk action dialog states
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [showBulkUnarchiveDialog, setShowBulkUnarchiveDialog] = useState(false);
  const [showBulkTrashDialog, setShowBulkTrashDialog] = useState(false);
  const [showBulkRestoreDialog, setShowBulkRestoreDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Get selected client IDs
  const selectedClientIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedCount = selectedClientIds.length;

  // Clear selection
  const clearSelection = () => setRowSelection({});

  // Bulk action handlers
  const handleBulkArchive = async () => {
    const result = await bulkArchiveClients(selectedClientIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} client${result.count === 1 ? "" : "s"} archived`);
      // Remove from favorites and recents
      selectedClientIds.forEach((id) => {
        removeFromFavorites(id);
        removeFromAllRecents(id);
      });
      clearSelection();
      router.refresh();
    }
  };

  const handleBulkUnarchive = async () => {
    const result = await bulkUnarchiveClients(selectedClientIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} client${result.count === 1 ? "" : "s"} unarchived`);
      clearSelection();
      router.refresh();
    }
  };

  const handleBulkTrash = async () => {
    const result = await bulkTrashClients(selectedClientIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} client${result.count === 1 ? "" : "s"} moved to trash`);
      // Remove from favorites and recents
      selectedClientIds.forEach((id) => {
        removeFromFavorites(id);
        removeFromAllRecents(id);
      });
      clearSelection();
      router.refresh();
    }
  };

  const handleBulkRestore = async () => {
    const result = await bulkRestoreClients(selectedClientIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} client${result.count === 1 ? "" : "s"} restored`);
      clearSelection();
      router.refresh();
    }
  };

  const handleBulkPermanentDelete = async () => {
    const result = await bulkPermanentlyDeleteClients(selectedClientIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} client${result.count === 1 ? "" : "s"} permanently deleted`);
      clearSelection();
      router.refresh();
    }
  };

  // Handle sort change from dropdown
  const handleSortChange = (field: string, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setSorting([{ id: field, desc: direction === "desc" }]);
  };

  // Handle filter toggle (multi-select)
  const handleFilterToggle = (filterId: string, value: string) => {
    setActiveFilters((prev) => {
      const existing = prev.find((f) => f.filterId === filterId);
      if (existing) {
        const hasValue = existing.values.includes(value);
        if (hasValue) {
          // Remove value
          const newValues = existing.values.filter((v) => v !== value);
          if (newValues.length === 0) {
            // Remove filter entirely if no values left
            return prev.filter((f) => f.filterId !== filterId);
          }
          return prev.map((f) =>
            f.filterId === filterId ? { ...f, values: newValues } : f
          );
        } else {
          // Add value
          return prev.map((f) =>
            f.filterId === filterId ? { ...f, values: [...f.values, value] } : f
          );
        }
      } else {
        // Create new filter with this value
        return [...prev, { filterId, values: [value] }];
      }
    });
  };

  // Reset display settings
  const handleResetDisplay = () => {
    setViewMode("table");
    setSortField("name");
    setSortDirection("asc");
    setSorting([]);
    setColumnVisibility(DEFAULT_VISIBILITY);
  };

  // Filter clients based on active filters (multi-select: OR within category, AND across categories)
  const filteredClients = initialClients.filter((client) => {
    for (const filter of activeFilters) {
      const { filterId, values } = filter;
      let matchesAny = false;

      for (const value of values) {
        switch (filterId) {
          case "stage":
            if (client.lifecycleStage === value) matchesAny = true;
            break;
          case "company":
            if (value === "has_company" && client.company) matchesAny = true;
            if (value === "no_company" && !client.company) matchesAny = true;
            break;
          case "tags":
            if (value === "has_tags" && client.tags.length > 0) matchesAny = true;
            if (value === "no_tags" && client.tags.length === 0) matchesAny = true;
            break;
          case "mrr":
            if (value === "has_mrr" && client.mrr && client.mrr > 0) matchesAny = true;
            if (value === "no_mrr" && (!client.mrr || client.mrr === 0)) matchesAny = true;
            if (value === "mrr_1k" && client.mrr && client.mrr > 1000) matchesAny = true;
            if (value === "mrr_5k" && client.mrr && client.mrr > 5000) matchesAny = true;
            break;
          case "ltv":
            if (value === "has_ltv" && client.ltv && client.ltv > 0) matchesAny = true;
            if (value === "no_ltv" && (!client.ltv || client.ltv === 0)) matchesAny = true;
            if (value === "ltv_5k" && client.ltv && client.ltv > 5000) matchesAny = true;
            if (value === "ltv_10k" && client.ltv && client.ltv > 10000) matchesAny = true;
            if (value === "ltv_25k" && client.ltv && client.ltv > 25000) matchesAny = true;
            break;
          case "projects":
            if (value === "has_projects" && client.projectCount && client.projectCount > 0) matchesAny = true;
            if (value === "no_projects" && (!client.projectCount || client.projectCount === 0)) matchesAny = true;
            break;
        }
      }

      // Must match at least one value in each filter category
      if (!matchesAny) return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header with title + search + settings */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="h-5 w-px bg-border mx-2" />
          <span className="text-2xl font-semibold">client directory</span>

          <div className="flex-1" />

          {/* Search in header */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-md bg-muted/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* View Toggle */}
          <ViewDropdown
            value={viewFilter}
            onChange={handleViewFilterChange}
          />

          {/* Filter */}
          <FilterDropdown
            activeFilters={activeFilters}
            onFilterToggle={handleFilterToggle}
            onClearFilters={() => setActiveFilters([])}
            variant="icon"
          />

          {/* Settings */}
          <Button size="icon" variant="secondary" className="size-8" asChild>
            <Link href="/settings/studio/profile">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === "table" && (
          <ClientsDataTable
            data={filteredClients}
            searchQuery={searchQuery}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            sorting={sorting}
            onSortingChange={setSorting}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            viewFilter={viewFilter}
          />
        )}
        {viewMode === "board" && (
          <ClientsBoardView clients={filteredClients} />
        )}
        {viewMode === "grid" && (
          <ClientsGridView
            clients={filteredClients}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      <ClientsBulkActionBar
        selectedCount={selectedCount}
        viewFilter={viewFilter}
        onClearSelection={clearSelection}
        onArchive={() => setShowBulkArchiveDialog(true)}
        onUnarchive={() => setShowBulkUnarchiveDialog(true)}
        onTrash={() => setShowBulkTrashDialog(true)}
        onRestore={() => setShowBulkRestoreDialog(true)}
        onPermanentDelete={() => setShowBulkDeleteDialog(true)}
      />

      {/* Bulk Archive Dialog */}
      <AlertDialog open={showBulkArchiveDialog} onOpenChange={setShowBulkArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedCount} client{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              These clients will be moved to the archived list. You can restore them anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Unarchive Dialog */}
      <AlertDialog open={showBulkUnarchiveDialog} onOpenChange={setShowBulkUnarchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unarchive {selectedCount} client{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              These clients will be restored to your active clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkUnarchive}>Unarchive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Trash Dialog */}
      <AlertDialog open={showBulkTrashDialog} onOpenChange={setShowBulkTrashDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedCount} client{selectedCount === 1 ? "" : "s"} to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              These clients will be moved to trash and permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleBulkTrash}>
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Restore Dialog */}
      <AlertDialog open={showBulkRestoreDialog} onOpenChange={setShowBulkRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {selectedCount} client{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              These clients will be restored from trash to your clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Permanent Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {selectedCount} client{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These clients and all their data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleBulkPermanentDelete}>
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Client Sheet */}
      <AddClientSheet
        open={addClientSheetOpen}
        onOpenChange={setAddClientSheetOpen}
        companies={companies}
        onSubmit={async (data: ClientCreateData) => {
          const result = await createClientWithIntent(data);
          return result;
        }}
        onInviteToBridge={(clientId) => {
          // TODO: Implement invite to bridge flow
          toast.success("Bridge invite will be sent");
        }}
        onCreateProject={(clientId) => {
          router.push(`/studio/projects/new?clientId=${clientId}`);
        }}
        onSendInvoice={(clientId) => {
          router.push(`/studio/billing/invoices/new?clientId=${clientId}`);
        }}
      />
    </div>
  );
}
