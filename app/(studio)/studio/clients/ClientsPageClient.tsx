"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Upload,
  SlidersHorizontal,
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
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@repo/ui";
import {
  ClientsDataTable,
  ClientsGridView,
  ClientsBoardView,
  type Client,
  type VisibilityState,
  type SortingState,
} from "@/app/_features/clients/components";

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
      { value: "lead", label: "Lead" },
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
}: {
  activeFilters: ActiveFilter[];
  onFilterToggle: (filterId: string, value: string) => void;
  onClearFilters: () => void;
}) {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const getFilterValues = (filterId: string): string[] => {
    return activeFilters.find((f) => f.filterId === filterId)?.values ?? [];
  };

  const totalFilterCount = activeFilters.reduce((sum, f) => sum + f.values.length, 0);

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

// Props interface
interface ClientsPageClientProps {
  initialClients: Client[];
  currentView?: ClientViewFilter;
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
}: ClientsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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

        {/* View Filter */}
        <div className="ml-3">
          <Select value={viewFilter} onValueChange={(v) => handleViewFilterChange(v as ClientViewFilter)}>
            <SelectTrigger className="!h-7 w-24 !py-0 text-xs border-none bg-muted/50 hover:bg-muted rounded-md shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="archived" className="text-xs">Archived</SelectItem>
              <SelectItem value="deleted" className="text-xs">Deleted</SelectItem>
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
      </div>

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
          />
        )}
        {viewMode === "board" && (
          <ClientsBoardView clients={filteredClients} />
        )}
        {viewMode === "grid" && (
          <ClientsGridView clients={filteredClients} />
        )}
      </div>
    </div>
  );
}
