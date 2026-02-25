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
  Avatar,
  AvatarFallback,
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
  Mail,
  Trash2,
  ExternalLink,
  Circle,
  CircleDot,
  Zap,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  RotateCcw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { archiveClient } from "@/app/actions/clients/archive-client";
import { unarchiveClient } from "@/app/actions/clients/unarchive-client";
import { trashClient } from "@/app/actions/clients/trash-client";
import { restoreClient } from "@/app/actions/clients/restore-client";

// Types
export type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

export interface Client {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  company: { id: string; name: string } | null;
  status: "active" | "invited" | "inactive";
  createdAt: string;
  tags: Array<{ id: string; label: string; color: string }>;
  lifecycleStage?: LifecycleStage;
  stageEnteredAt?: string | null;
  mrr?: number;
  ltv?: number;
  projectCount?: number;
  lastContactAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

// Stage configuration
const STAGE_CONFIG: Record<LifecycleStage, { label: string; icon: React.ReactNode; className: string }> = {
  lead: { label: "Lead", icon: <Circle className="size-3.5" />, className: "text-muted-foreground" },
  discovery: { label: "Discovery", icon: <CircleDot className="size-3.5" />, className: "text-muted-foreground" },
  pitch: { label: "Pitch", icon: <Zap className="size-3.5" />, className: "text-amber-500" },
  active: { label: "Client", icon: <CircleDot className="size-3.5" />, className: "text-blue-500" },
  complete: { label: "Complete", icon: <CheckCircle2 className="size-3.5" />, className: "text-green-500" },
  on_hold: { label: "On Hold", icon: <PauseCircle className="size-3.5" />, className: "text-amber-500" },
  lost: { label: "Lost", icon: <XCircle className="size-3.5" />, className: "text-red-500" },
};

function getDaysInStage(stageEnteredAt?: string | null): string {
  if (!stageEnteredAt) return "—";
  const entered = new Date(stageEnteredAt);
  if (isNaN(entered.getTime())) return "—";
  const days = Math.ceil(Math.abs(Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24));
  return days === 0 ? "Today" : `${days}d`;
}

// Row Actions Component with confirmation dialogs
function ClientRowActions({ client }: { client: Client }) {
  const router = useRouter();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const isArchived = !!client.archivedAt;
  const isDeleted = !!client.deletedAt;

  const handleArchive = async () => {
    const result = await archiveClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client archived");
      router.refresh();
    }
  };

  const handleUnarchive = async () => {
    const result = await unarchiveClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client unarchived");
      router.refresh();
    }
  };

  const handleTrash = async () => {
    const result = await trashClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client moved to trash");
      router.refresh();
    }
  };

  const handleRestore = async () => {
    const result = await restoreClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client restored");
      router.refresh();
    }
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
            <Link href={`/studio/clients/${client.id}`}>
              <ExternalLink className="size-4 mr-2" />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Mail className="size-4 mr-2" />
            Send message
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
            <AlertDialogTitle>Archive this client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{client.name}</strong> will be moved to the archived list.
              You can restore them anytime.
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
            <AlertDialogTitle>Unarchive this client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{client.name}</strong> will be restored to your active clients list.
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
            <AlertDialogTitle>Move client to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move <strong className="text-foreground">{client.name}</strong> to trash?
              This client will be permanently deleted after 30 days.
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
            <AlertDialogTitle>Restore this client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{client.name}</strong> will be restored from trash to your clients list.
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
export const columns: ColumnDef<Client>[] = [
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
      const client = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-muted text-xs font-medium">
              {client.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{client.name}</p>
            {client.contactEmail && (
              <p className="text-xs text-muted-foreground truncate">{client.contactEmail}</p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => {
      const company = row.original.company;
      if (!company) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="bg-muted text-xs">
              {company.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{company.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "lifecycleStage",
    header: "Stage",
    cell: ({ row }) => {
      const stage = (row.original.lifecycleStage || "lead") as LifecycleStage;
      const config = STAGE_CONFIG[stage] || STAGE_CONFIG.lead;
      return (
        <div className={cn("flex items-center gap-1.5", config.className)}>
          {config.icon}
          <span>{config.label}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "stageEnteredAt",
    header: "Days",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{getDaysInStage(row.original.stageEnteredAt)}</span>
    ),
  },
  {
    accessorKey: "mrr",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        MRR
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const mrr = row.original.mrr;
      if (!mrr || mrr === 0) return <span className="text-muted-foreground">—</span>;
      return <span className="text-green-600">${mrr.toLocaleString()}/mo</span>;
    },
  },
  {
    accessorKey: "ltv",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        LTV
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => {
      const ltv = row.original.ltv;
      if (!ltv || ltv === 0) return <span className="text-muted-foreground">—</span>;
      return <span>${ltv.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "projectCount",
    header: "Projects",
    cell: ({ row }) => <span>{row.original.projectCount ?? 0}</span>,
  },
  {
    accessorKey: "lastContactAt",
    header: "Last Contact",
    cell: ({ row }) => {
      const lastContact = row.original.lastContactAt;
      if (!lastContact || isNaN(new Date(lastContact).getTime())) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(lastContact), { addSuffix: true })}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {format(new Date(row.original.createdAt), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ClientRowActions client={row.original} />,
  },
];

interface ClientsDataTableProps {
  data: Client[];
  searchQuery?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

export function ClientsDataTable({
  data,
  searchQuery = "",
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  sorting: controlledSorting,
  onSortingChange,
}: ClientsDataTableProps) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalVisibility, setInternalVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
                  window.location.href = `/studio/clients/${row.original.id}`;
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
                No clients found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
