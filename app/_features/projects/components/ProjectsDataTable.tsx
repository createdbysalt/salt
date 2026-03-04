"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

export type { SortingState, VisibilityState };
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Checkbox,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui";
import {
  MoreHorizontal,
  ExternalLink,
  Trash2,
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Types
export interface Project {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string;
  status: string;
  isRetainer: boolean;
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  milestoneProgress: { completed: number; total: number } | null;
  usedHours: number | null;
  includedHours: number | null;
  monthlyAmount: number | null;
  totalValue: number | null;
  deadline: string | null;
  renewalDate: string | null;
  createdAt: string;
  taskCount: number;
  tags: Array<{ id: string; label: string; color: string }>;
  stageEnteredAt: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

// Status configuration - monochrome, no colors
const STATUS_CONFIG: Record<string, { label: string }> = {
  not_started: { label: "Not Started" },
  draft: { label: "Draft" },
  active: { label: "Active" },
  in_progress: { label: "In Progress" },
  review: { label: "Review" },
  complete: { label: "Complete" },
  completed: { label: "Completed" },
  on_hold: { label: "On Hold" },
};

function getHealthBadge(status: string | null) {
  // Only show badge for critical states (overdue) - monochrome otherwise
  if (status === "overdue") {
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Overdue</Badge>;
  }
  // Don't show anything for on-track or at-risk - keep table clean
  return <span className="text-muted-foreground text-xs">—</span>;
}

// Row Actions Component with confirmation dialogs
function ProjectRowActions({ project }: { project: Project }) {
  const router = useRouter();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const isArchived = !!project.archivedAt;
  const isDeleted = !!project.deletedAt;

  const handleArchive = async () => {
    // TODO: Implement archiveProject action
    toast.success("Project archived");
    router.refresh();
  };

  const handleUnarchive = async () => {
    // TODO: Implement unarchiveProject action
    toast.success("Project unarchived");
    router.refresh();
  };

  const handleTrash = async () => {
    // TODO: Implement trashProject action
    toast.success("Project moved to trash");
    router.refresh();
  };

  const handleRestore = async () => {
    // TODO: Implement restoreProject action
    toast.success("Project restored");
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem asChild>
            <Link href={`/studio/projects/${project.id}`}>
              <ExternalLink className="size-4 mr-2" />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Archive / Unarchive */}
          {isArchived ? (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowUnarchiveDialog(true); }}>
              <ArchiveRestore className="size-4 mr-2" />
              Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowArchiveDialog(true); }}>
              <Archive className="size-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )}

          {/* Delete / Restore */}
          {isDeleted ? (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowRestoreDialog(true); }}>
              <RotateCcw className="size-4 mr-2" />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{project.name}</strong> will be moved to the archived list.
              You can restore it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog open={showUnarchiveDialog} onOpenChange={setShowUnarchiveDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Unarchive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{project.name}</strong> will be restored to your active projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>
              Unarchive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Move project to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move <strong className="text-foreground">{project.name}</strong> to trash?
              This project will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleTrash}>
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{project.name}</strong> will be restored from trash to your projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Column definitions
export const columns: ColumnDef<Project>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
        <span className="font-medium truncate">{project.name}</span>
      );
    },
  },
  {
    accessorKey: "client",
    header: "Client",
    cell: ({ row }) => {
      const clientName = row.original.clientName;
      if (!clientName || clientName === "No client") return <span className="text-muted-foreground">—</span>;
      return <span className="truncate">{clientName}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || "draft";
      const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
      return <span className="text-muted-foreground">{config.label}</span>;
    },
  },
  {
    accessorKey: "health",
    header: "Health",
    cell: ({ row }) => getHealthBadge(row.original.healthStatus),
  },
  {
    accessorKey: "milestones",
    header: "Progress",
    cell: ({ row }) => {
      const project = row.original;
      if (project.isRetainer) {
        // Hours for retainers
        if (!project.includedHours) return <span className="text-muted-foreground">—</span>;
        return <span className="text-muted-foreground">{project.usedHours || 0}/{project.includedHours}h</span>;
      } else if (project.milestoneProgress) {
        // Milestones for one-time
        return <span className="text-muted-foreground">{project.milestoneProgress.completed}/{project.milestoneProgress.total}</span>;
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "value",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Value
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const project = row.original;
      if (project.isRetainer && project.monthlyAmount) {
        return <span>${project.monthlyAmount.toLocaleString()}/mo</span>;
      } else if (project.totalValue) {
        return <span>${project.totalValue.toLocaleString()}</span>;
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
        Due Date
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const deadline = row.original.deadline;
      if (!deadline) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-muted-foreground">
          {format(new Date(deadline), "MMM d, yyyy")}
        </span>
      );
    },
  },
  {
    accessorKey: "tasks",
    header: "Tasks",
    cell: ({ row }) => <span>{row.original.taskCount}</span>,
  },
  {
    id: "actions",
    cell: ({ row }) => <ProjectRowActions project={row.original} />,
  },
];

export type RowSelectionState = Record<string, boolean>;

export type ViewFilter = "active" | "archived" | "deleted";

interface ProjectsDataTableProps {
  data: Project[];
  searchQuery?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  viewFilter?: ViewFilter;
}

export function ProjectsDataTable({
  data,
  searchQuery = "",
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  sorting: controlledSorting,
  onSortingChange,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  viewFilter = "active",
}: ProjectsDataTableProps) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalVisibility, setInternalVisibility] = React.useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});

  const rowSelection = controlledRowSelection ?? internalRowSelection;

  // Use controlled state if provided, otherwise use internal state
  const sorting = controlledSorting ?? internalSorting;
  const columnVisibility = controlledVisibility ?? internalVisibility;

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newValue = typeof updater === "function" ? updater(sorting) : updater;
    if (onSortingChange) {
      onSortingChange(newValue);
    } else {
      setInternalSorting(newValue);
    }
  };

  const handleVisibilityChange = (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
    const newValue = typeof updater === "function" ? updater(columnVisibility) : updater;
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(newValue);
    } else {
      setInternalVisibility(newValue);
    }
  };

  const handleRowSelectionChange = (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    const newValue = typeof updater === "function" ? updater(rowSelection) : updater;
    if (onRowSelectionChange) {
      onRowSelectionChange(newValue);
    } else {
      setInternalRowSelection(newValue);
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter: searchQuery,
    },
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs font-medium text-muted-foreground">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  window.location.href = `/studio/projects/${row.original.id}`;
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No projects found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
