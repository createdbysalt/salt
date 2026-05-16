"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  FolderKanban,
  Plus,
  MoreHorizontal,
  ExternalLink,
  ArrowUpDown,
  Circle,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { getProjectsWithMetrics, type ProjectWithMetrics } from "@/app/actions/projects/get-projects-with-metrics";
import { ProjectsBulkActionBar } from "./ProjectsBulkActionBar";

// =============================================================================
// Types
// =============================================================================

interface ProjectsTabProps {
  clientId: string;
  clientName: string;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getStatusBadge(status: string) {
  switch (status) {
    case "not_started":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Circle className="size-3 mr-1" />
          Not Started
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="outline" className="border-info/50 bg-info/10 text-info">
          <Loader2 className="size-3 mr-1" />
          In Progress
        </Badge>
      );
    case "on_hold":
      return (
        <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
          <Clock className="size-3 mr-1" />
          On Hold
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-success/50 bg-success/10 text-success">
          <CheckCircle2 className="size-3 mr-1" />
          Completed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {status}
        </Badge>
      );
  }
}

function getTypeBadge(isRetainer: boolean) {
  if (isRetainer) {
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="size-3" />
        Retainer
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      One-time
    </Badge>
  );
}

function getHealthBadge(health: "on-track" | "at-risk" | "overdue" | null) {
  switch (health) {
    case "on-track":
      return (
        <Badge variant="outline" className="border-success/50 bg-success/10 text-success">
          <TrendingUp className="size-3 mr-1" />
          On Track
        </Badge>
      );
    case "at-risk":
      return (
        <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
          <AlertCircle className="size-3 mr-1" />
          At Risk
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertCircle className="size-3 mr-1" />
          Overdue
        </Badge>
      );
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "—";
  try {
    return format(new Date(deadline), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

// =============================================================================
// Row Actions
// =============================================================================

function RowActions({ project }: { project: ProjectWithMetrics }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/studio/projects/${project.id}`}>
            <ExternalLink className="size-4 mr-2" />
            View Project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/studio/projects/${project.id}/settings`}>
            Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Column Definitions
// =============================================================================

function createColumns(): ColumnDef<ProjectWithMetrics>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const project = row.original;
      return (
        <Link
          href={`/studio/projects/${project.id}`}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {project.name}
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    accessorKey: "isRetainer",
    header: "Type",
    cell: ({ row }) => getTypeBadge(row.original.isRetainer),
  },
  {
    accessorKey: "milestoneProgress",
    header: "Progress",
    cell: ({ row }) => {
      const project = row.original;

      if (project.isRetainer && project.includedHours && project.usedHours !== null) {
        const percentage = Math.min(100, Math.round((project.usedHours / project.includedHours) * 100));
        return (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-9">{percentage}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {project.usedHours}h / {project.includedHours}h used
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      if (project.milestoneProgress && project.milestoneProgress.total > 0) {
        const { completed, total } = project.milestoneProgress;
        const percentage = Math.round((completed / total) * 100);
        return (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-9">{percentage}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {completed} / {total} milestones complete
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Deadline
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const deadline = row.original.deadline;
      if (!deadline) return <span className="text-muted-foreground">—</span>;

      const isPast = new Date(deadline) < new Date();
      return (
        <div className="flex items-center gap-1.5">
          <Calendar className={cn("size-3.5", isPast ? "text-destructive" : "text-muted-foreground")} />
          <span className={cn(isPast && "text-destructive")}>
            {formatDeadline(deadline)}
          </span>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.deadline;
      const b = rowB.original.deadline;
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    },
  },
  {
    accessorKey: "healthStatus",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Health
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => getHealthBadge(row.original.healthStatus),
  },
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => <RowActions project={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="size-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="size-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// =============================================================================
// Toolbar
// =============================================================================

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  clientId: string;
}

function Toolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  clientId,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 w-[240px] bg-muted/50 border-transparent focus:border-border"
        />
      </div>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-[140px] bg-muted/50 border-transparent">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="not_started">Not Started</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="on_hold">On Hold</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions */}
      <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
        <Link href={`/studio/projects/new?clientId=${clientId}`}>
          <Plus className="size-4" />
          Add Project
        </Link>
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectsTab({ clientId, clientName: _clientName, className }: ProjectsTabProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const columns = useMemo(() => createColumns(), []);

  // Fetch projects on mount
  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      try {
        const data = await getProjectsWithMetrics({ clientId });
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [clientId]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    return result;
  }, [projects, searchQuery, statusFilter]);

  const table = useReactTable({
    data: filteredProjects,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  // Get selected project IDs
  const selectedProjectIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedCount = selectedProjectIds.length;

  // Clear selection
  const clearSelection = () => setRowSelection({});

  // Bulk status change handler
  const handleBulkStatusChange = async (status: "not_started" | "in_progress" | "on_hold" | "completed") => {
    // TODO: Implement bulk status update action
    toast.success(`Status updated to ${status.replace("_", " ")} for ${selectedCount} project${selectedCount === 1 ? "" : "s"}`);
    clearSelection();
  };

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className={cn("p-6 space-y-4", className)}>
        {/* Toolbar */}
        <Toolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          clientId={clientId}
        />

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.id === "select" && "w-12",
                        header.id === "actions" && "w-12"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                        <FolderKanban className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No projects yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create a project to start tracking work for this client.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/studio/projects/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <ProjectsBulkActionBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onSetStatus={handleBulkStatusChange}
      />
    </>
  );
}
