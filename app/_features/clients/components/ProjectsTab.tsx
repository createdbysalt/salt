"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
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
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
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
import { getProjectsWithMetrics, type ProjectWithMetrics } from "@/app/actions/projects/get-projects-with-metrics";

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
        <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-600">
          <Loader2 className="size-3 mr-1" />
          In Progress
        </Badge>
      );
    case "on_hold":
      return (
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600">
          <Clock className="size-3 mr-1" />
          On Hold
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600">
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
        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600">
          <TrendingUp className="size-3 mr-1" />
          On Track
        </Badge>
      );
    case "at-risk":
      return (
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600">
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

function createColumns(clientId: string): ColumnDef<ProjectWithMetrics>[] {
  return [
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
    header: () => (
      <Button asChild variant="ghost" size="icon" className="size-7">
        <Link href={`/studio/projects/new?clientId=${clientId}`}>
          <Plus className="size-4" />
        </Link>
      </Button>
    ),
    cell: ({ row }) => <RowActions project={row.original} />,
  },
];
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
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

  // Create columns with clientId for the add button link
  const columns = useMemo(() => createColumns(clientId), [clientId]);

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

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("p-6", className)}>
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(header.id === "actions" && "w-12 text-right")}
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
                    <Button asChild size="sm" className="mt-3">
                      <Link href={`/studio/projects/new?clientId=${clientId}`}>
                        <Plus className="size-4" />
                        Add Project
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
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
  );
}
