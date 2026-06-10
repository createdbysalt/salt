"use client"

import * as React from "react"
import { useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

export type { SortingState, VisibilityState }

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
} from "@repo/ui"
import {
  MoreHorizontal,
  Copy,
  Trash2,
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  RotateCcw,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { StudioService } from "../types"
import { formatPrice } from "../hooks/useWorkspaceServices"
import {
  archiveService,
  unarchiveService,
  trashService,
  restoreService,
  permanentlyDeleteService,
} from "../actions"

// Types
export type RowSelectionState = Record<string, boolean>
export type ViewFilter = "active" | "archived" | "deleted"

// Pricing type labels
const PRICING_TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed",
  hourly: "Hourly",
  retainer: "Retainer",
  custom: "Custom",
}

// Row Actions Component with confirmation dialogs
function ServiceRowActions({
  service,
  onEdit,
  viewFilter = "active",
}: {
  service: StudioService
  onEdit: () => void
  viewFilter?: ViewFilter
}) {
  const router = useRouter()
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)

  const isArchived = !!service.archived_at
  const isDeleted = !!service.deleted_at

  const handleArchive = async () => {
    const result = await archiveService(service.id)
    if (result.success) {
      toast.success("Service archived")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to archive service")
    }
  }

  const handleUnarchive = async () => {
    const result = await unarchiveService(service.id)
    if (result.success) {
      toast.success("Service unarchived")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to unarchive service")
    }
  }

  const handleTrash = async () => {
    const result = await trashService(service.id)
    if (result.success) {
      toast.success("Service moved to trash")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to move service to trash")
    }
  }

  const handleRestore = async () => {
    const result = await restoreService(service.id)
    if (result.success) {
      toast.success("Service restored")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to restore service")
    }
  }

  const handlePermanentDelete = async () => {
    const result = await permanentlyDeleteService(service.id)
    if (result.success) {
      toast.success("Service permanently deleted")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to delete service")
    }
  }

  const handleDuplicate = async () => {
    // TODO: Implement duplicateService action
    toast.success("Service duplicated")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <ExternalLink className="size-4 mr-2" />
            View details
          </DropdownMenuItem>

          {viewFilter === "active" && (
            <>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleDuplicate()
                }}
              >
                <Copy className="size-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Archive */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setShowArchiveDialog(true)
                }}
              >
                <Archive className="size-4 mr-2" />
                Archive
              </DropdownMenuItem>

              {/* Delete */}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}

          {viewFilter === "archived" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUnarchiveDialog(true)
                }}
              >
                <ArchiveRestore className="size-4 mr-2" />
                Unarchive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}

          {viewFilter === "deleted" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRestoreDialog(true)
                }}
              >
                <RotateCcw className="size-4 mr-2" />
                Restore
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="size-4 mr-2" />
                Delete Forever
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this service?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{service.name}</strong> will be moved to the archived list.
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
            <AlertDialogTitle>Unarchive this service?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{service.name}</strong> will be restored to your active services list.
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

      {/* Delete/Trash Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {viewFilter === "deleted" ? "Permanently delete" : "Move service to trash"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {viewFilter === "deleted" ? (
                <>
                  This action cannot be undone. <strong className="text-foreground">{service.name}</strong> will be permanently removed.
                </>
              ) : (
                <>
                  <strong className="text-foreground">{service.name}</strong> will be moved to trash and permanently deleted after 30 days.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={viewFilter === "deleted" ? handlePermanentDelete : handleTrash}
            >
              {viewFilter === "deleted" ? "Delete Forever" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this service?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{service.name}</strong> will be restored from trash to your services list.
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
  )
}

// Create columns factory that accepts onEdit callback and viewFilter
function createColumns(
  onEdit: (service: StudioService) => void,
  viewFilter: ViewFilter = "active"
): ColumnDef<StudioService>[] {
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
        const service = row.original
        return (
          <span className="font-medium truncate">{service.name}</span>
        )
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category
        if (!category) return <span className="text-muted-foreground">—</span>
        return <span className="truncate">{category}</span>
      },
    },
    {
      accessorKey: "pricingType",
      header: "Type",
      cell: ({ row }) => {
        const pricingType = row.original.pricing_type
        if (!pricingType) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-muted-foreground">
            {PRICING_TYPE_LABELS[pricingType] || pricingType}
          </span>
        )
      },
    },
    {
      accessorKey: "pricing",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="size-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const service = row.original
        const priceDisplay = formatPrice(
          service.price_min,
          service.price_max,
          service.pricing_type,
          service.currency
        )
        if (priceDisplay === "Custom pricing") {
          return <span className="text-muted-foreground">—</span>
        }
        return <span>{priceDisplay}</span>
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.price_min || 0
        const b = rowB.original.price_min || 0
        return a - b
      },
    },
    {
      accessorKey: "syncStatus",
      header: "Sync",
      cell: ({ row }) => {
        const status = row.original.stripe_sync_status
        if (status === "synced") {
          return <span className="text-muted-foreground text-xs">Synced</span>
        }
        if (status === "not_synced" || !status) {
          return (
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
              Not synced
            </Badge>
          )
        }
        if (status === "sync_error") {
          return (
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
              Sync Error
            </Badge>
          )
        }
        if (status === "pending") {
          return <span className="text-muted-foreground text-xs">Syncing...</span>
        }
        return <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: "timeline",
      header: "Timeline",
      cell: ({ row }) => {
        const timeline = row.original.typical_timeline
        if (!timeline) return <span className="text-muted-foreground">—</span>
        return <span className="text-muted-foreground truncate">{timeline}</span>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ServiceRowActions
          service={row.original}
          onEdit={() => onEdit(row.original)}
          viewFilter={viewFilter}
        />
      ),
    },
  ]
}

interface ServicesDataTableProps {
  data: StudioService[]
  searchQuery?: string
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (selection: RowSelectionState) => void
  onEditService?: (service: StudioService) => void
  viewFilter?: ViewFilter
}

export function ServicesDataTable({
  data,
  searchQuery = "",
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  sorting: controlledSorting,
  onSortingChange,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  onEditService,
  viewFilter = "active",
}: ServicesDataTableProps) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [internalVisibility, setInternalVisibility] = React.useState<VisibilityState>({})
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})

  const rowSelection = controlledRowSelection ?? internalRowSelection
  const sorting = controlledSorting ?? internalSorting
  const columnVisibility = controlledVisibility ?? internalVisibility

  const columns = React.useMemo(
    () => createColumns(onEditService || (() => {}), viewFilter),
    [onEditService, viewFilter]
  )

  const handleSortingChange = (
    updater: SortingState | ((old: SortingState) => SortingState)
  ) => {
    const newValue = typeof updater === "function" ? updater(sorting) : updater
    if (onSortingChange) {
      onSortingChange(newValue)
    } else {
      setInternalSorting(newValue)
    }
  }

  const handleVisibilityChange = (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState)
  ) => {
    const newValue = typeof updater === "function" ? updater(columnVisibility) : updater
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(newValue)
    } else {
      setInternalVisibility(newValue)
    }
  }

  const handleRowSelectionChange = (
    updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)
  ) => {
    const newValue = typeof updater === "function" ? updater(rowSelection) : updater
    if (onRowSelectionChange) {
      onRowSelectionChange(newValue)
    } else {
      setInternalRowSelection(newValue)
    }
  }

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
  })

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-xs font-medium text-muted-foreground"
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onEditService?.(row.original)}
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
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No services found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
