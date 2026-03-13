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
  Calendar,
  Check,
  Plus,
  RefreshCw,
  Activity,
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
} from "@repo/ui";
import type { ProjectWithMetrics } from "@/app/actions/projects/get-projects-with-metrics";
import {
  ProjectsDataTable,
  ProjectsGridView,
  ProjectsBoardView,
  ProjectsBulkActionBar,
  AddProjectSheet,
  type ProjectRowSelectionState,
  type ProjectSortingState,
  type ProjectCreateData,
} from "@/app/_features/projects/components";
import { createProjectWithIntent } from "@/app/_features/projects/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui";
import { toast } from "sonner";

// Display properties configuration
const DISPLAY_PROPERTIES = [
  { id: "client", label: "Client" },
  { id: "status", label: "Status" },
  { id: "health", label: "Health" },
  { id: "milestones", label: "Progress" },
  { id: "type", label: "Type" },
  { id: "value", label: "Value" },
  { id: "deadline", label: "Due Date" },
  { id: "tasks", label: "Tasks" },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "updatedAt", label: "Updated" },
  { value: "createdAt", label: "Created" },
  { value: "deadline", label: "Due Date" },
  { value: "status", label: "Status" },
] as const;

// Filter options
const FILTER_OPTIONS = [
  {
    id: "status",
    label: "Status",
    icon: CircleDot,
    options: [
      { value: "not_started", label: "Not Started" },
      { value: "in_progress", label: "In Progress" },
      { value: "review", label: "Review" },
      { value: "complete", label: "Complete" },
      { value: "on_hold", label: "On Hold" },
    ],
  },
  {
    id: "type",
    label: "Type",
    icon: RefreshCw,
    options: [
      { value: "retainer", label: "Retainer" },
      { value: "one_time", label: "One-Time" },
    ],
  },
  {
    id: "health",
    label: "Health",
    icon: Activity,
    options: [
      { value: "on-track", label: "On Track" },
      { value: "at-risk", label: "At Risk" },
      { value: "overdue", label: "Overdue" },
    ],
  },
  {
    id: "client",
    label: "Client",
    icon: Building2,
    options: [
      { value: "has_client", label: "Has client" },
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
    id: "value",
    label: "Value",
    icon: DollarSign,
    options: [
      { value: "has_value", label: "Has value" },
      { value: "no_value", label: "No value" },
      { value: "value_1k", label: "> $1,000" },
      { value: "value_5k", label: "> $5,000" },
    ],
  },
  {
    id: "deadline",
    label: "Due Date",
    icon: Calendar,
    options: [
      { value: "has_deadline", label: "Has deadline" },
      { value: "no_deadline", label: "No deadline" },
      { value: "this_week", label: "This week" },
      { value: "this_month", label: "This month" },
      { value: "overdue", label: "Overdue" },
    ],
  },
] as const;

// Types
type ViewMode = "table" | "board" | "grid";
type SortDirection = "asc" | "desc";
type ProjectViewFilter = "active" | "archived" | "deleted";

interface ActiveFilter {
  filterId: string;
  values: string[];
}

type VisibilityState = Record<string, boolean>;

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

// Props interface
interface ProjectsPageClientProps {
  initialProjects: ProjectWithMetrics[];
  currentView?: ProjectViewFilter;
  clients: { id: string; name: string }[];
}

// Default column visibility
const DEFAULT_VISIBILITY: VisibilityState = {
  client: true,
  status: true,
  health: true,
  milestones: true,
  type: true,
  value: true,
  deadline: true,
  tasks: true,
};

export function ProjectsPageClient({
  initialProjects,
  currentView = "active",
  clients,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Add Project Sheet state
  const [addProjectSheetOpen, setAddProjectSheetOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // View filter state (for UI, actual filtering happens server-side)
  const [viewFilter, setViewFilter] = useState<ProjectViewFilter>(currentView);

  const handleViewFilterChange = (view: ProjectViewFilter) => {
    setViewFilter(view);
    // Update URL to trigger server-side re-fetch
    const params = new URLSearchParams(searchParams.toString());
    if (view === "active") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const queryString = params.toString();
    router.push(queryString ? `/studio/projects?${queryString}` : "/studio/projects");
  };

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Sort state
  const [sortField, setSortField] = useState("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sorting, setSorting] = useState<ProjectSortingState>([]);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Row selection state
  const [rowSelection, setRowSelection] = useState<ProjectRowSelectionState>({});

  // Bulk action dialog states
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [showBulkUnarchiveDialog, setShowBulkUnarchiveDialog] = useState(false);
  const [showBulkTrashDialog, setShowBulkTrashDialog] = useState(false);
  const [showBulkRestoreDialog, setShowBulkRestoreDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Get selected project IDs
  const selectedProjectIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedCount = selectedProjectIds.length;

  // Clear selection
  const clearSelection = () => setRowSelection({});

  // Bulk action handlers
  const handleBulkArchive = async () => {
    // TODO: Implement bulkArchiveProjects action
    toast.success(`${selectedCount} project${selectedCount === 1 ? "" : "s"} archived`);
    clearSelection();
    router.refresh();
  };

  const handleBulkUnarchive = async () => {
    // TODO: Implement bulkUnarchiveProjects action
    toast.success(`${selectedCount} project${selectedCount === 1 ? "" : "s"} unarchived`);
    clearSelection();
    router.refresh();
  };

  const handleBulkTrash = async () => {
    // TODO: Implement bulkTrashProjects action
    toast.success(`${selectedCount} project${selectedCount === 1 ? "" : "s"} moved to trash`);
    clearSelection();
    router.refresh();
  };

  const handleBulkRestore = async () => {
    // TODO: Implement bulkRestoreProjects action
    toast.success(`${selectedCount} project${selectedCount === 1 ? "" : "s"} restored`);
    clearSelection();
    router.refresh();
  };

  const handleBulkPermanentDelete = async () => {
    // TODO: Implement bulkPermanentlyDeleteProjects action
    toast.success(`${selectedCount} project${selectedCount === 1 ? "" : "s"} permanently deleted`);
    clearSelection();
    router.refresh();
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
    setSortField("updatedAt");
    setSortDirection("desc");
    setColumnVisibility(DEFAULT_VISIBILITY);
  };

  // Get enabled properties as array for view components
  const enabledProperties = Object.entries(columnVisibility)
    .filter(([, visible]) => visible)
    .map(([key]) => key);

  // Filter projects based on search and active filters
  const filteredProjects = initialProjects.filter((project) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = project.name.toLowerCase().includes(query);
      const matchesClient = project.clientName.toLowerCase().includes(query);
      if (!matchesName && !matchesClient) return false;
    }

    // Apply active filters
    for (const filter of activeFilters) {
      const { filterId, values } = filter;
      let matchesAny = false;

      for (const value of values) {
        switch (filterId) {
          case "status":
            if (project.status === value) matchesAny = true;
            break;
          case "type":
            if (value === "retainer" && project.isRetainer) matchesAny = true;
            if (value === "one_time" && !project.isRetainer) matchesAny = true;
            break;
          case "health":
            if (project.healthStatus === value) matchesAny = true;
            break;
          case "tags":
            if (value === "has_tags" && project.tags.length > 0) matchesAny = true;
            if (value === "no_tags" && project.tags.length === 0) matchesAny = true;
            break;
          case "value":
            const totalValue = project.isRetainer ? project.monthlyAmount : project.totalValue;
            if (value === "has_value" && totalValue && totalValue > 0) matchesAny = true;
            if (value === "no_value" && (!totalValue || totalValue === 0)) matchesAny = true;
            if (value === "value_1k" && totalValue && totalValue > 1000) matchesAny = true;
            if (value === "value_5k" && totalValue && totalValue > 5000) matchesAny = true;
            break;
          case "deadline":
            if (value === "has_deadline" && project.deadline) matchesAny = true;
            if (value === "no_deadline" && !project.deadline) matchesAny = true;
            if (value === "overdue" && project.healthStatus === "overdue") matchesAny = true;
            break;
        }
      }

      // Must match at least one value in each filter category
      if (!matchesAny) return false;
    }
    return true;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "updatedAt":
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "deadline":
        if (!a.deadline && !b.deadline) comparison = 0;
        else if (!a.deadline) comparison = 1;
        else if (!b.deadline) comparison = -1;
        else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Transform data for view components
  const projectsForViews = sortedProjects.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.clientName,
    clientId: p.clientId,
    status: p.status,
    isRetainer: p.isRetainer,
    healthStatus: p.healthStatus,
    milestoneProgress: p.milestoneProgress,
    usedHours: p.usedHours,
    includedHours: p.includedHours,
    monthlyAmount: p.monthlyAmount,
    totalValue: p.totalValue,
    deadline: p.deadline,
    renewalDate: p.renewalDate,
    createdAt: p.createdAt,
    taskCount: p.taskCount,
    tags: p.tags,
    stageEnteredAt: p.stageEnteredAt,
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 shrink-0"
          />
          <nav className="flex items-center gap-1 text-sm min-w-0">
            <span className="font-medium">Projects</span>
          </nav>
        </div>

        <div className="ml-auto">
          <Button
            size="xs"
            variant="secondary"
            className="px-4"
            onClick={() => setAddProjectSheetOpen(true)}
          >
            <Plus className="size-3" />
            Project
          </Button>
        </div>
      </header>

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
          <Select value={viewFilter} onValueChange={(v) => handleViewFilterChange(v as ProjectViewFilter)}>
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
          <ProjectsDataTable
            data={projectsForViews}
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
          <ProjectsBoardView
            projects={projectsForViews}
            enabledProperties={enabledProperties}
          />
        )}
        {viewMode === "grid" && (
          <ProjectsGridView
            projects={projectsForViews}
            enabledProperties={enabledProperties}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      <ProjectsBulkActionBar
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
            <AlertDialogTitle>Archive {selectedCount} project{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              These projects will be moved to the archived list. You can restore them anytime.
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
            <AlertDialogTitle>Unarchive {selectedCount} project{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              These projects will be restored to your active projects list.
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
            <AlertDialogTitle>Move {selectedCount} project{selectedCount === 1 ? "" : "s"} to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              These projects will be moved to trash and permanently deleted after 30 days.
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
            <AlertDialogTitle>Restore {selectedCount} project{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              These projects will be restored from trash to your projects list.
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
            <AlertDialogTitle>Permanently delete {selectedCount} project{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These projects and all their data will be permanently removed.
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

      {/* Add Project Sheet */}
      <AddProjectSheet
        open={addProjectSheetOpen}
        onOpenChange={setAddProjectSheetOpen}
        clients={clients}
        onSubmit={async (data: ProjectCreateData) => {
          const result = await createProjectWithIntent({
            intent: data.intent,
            name: data.name,
            clientId: data.clientId,
            description: data.description,
            status: data.status,
            startDate: data.startDate,
            deadline: data.deadline,
            totalValue: data.totalValue,
            monthlyAmount: data.monthlyAmount,
            includedHours: data.includedHours,
          });

          if (result.success) {
            router.refresh();
          }

          return result;
        }}
      />
    </div>
  );
}
