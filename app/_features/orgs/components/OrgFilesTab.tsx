"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type RowSelectionState,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import {
  Search,
  SlidersHorizontal,
  FileText,
  Archive,
  Trash2,
  Link2Off,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Checkbox,
} from "@repo/ui";
import { selectionColumn, memoryCheckboxClassName } from "@/app/_features/memory/components/DataTable";
import { BulkActionDock, bulkActionDockPanelClassName } from "@/app/_features/memory/components/BulkActionDock";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import { cn } from "@repo/utils";
import type { LinkedFile } from "@/app/_lib/demo/people-demo-data";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { relativeDays } from "@/app/_lib/demo/orgs-demo-data";

const CAT_LABEL: Record<LinkedFile["category"], string> = {
  brand_asset: "Brand asset",
  deliverable: "Deliverable",
  contract: "Contract",
  screenshot: "Screenshot",
  other: "Other",
};

const FILTERS = [
  {
    columnId: "category",
    label: "Category",
    options: Object.entries(CAT_LABEL).map(([value, label]) => ({ value, label })),
  },
];

const multiFilter = (row: any, id: string, value: string[]) =>
  !value?.length || value.includes(row.getValue(id));

export function OrgFilesTab({ org }: { org: Org }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo<ColumnDef<LinkedFile>[]>(
    () => [
      selectionColumn<LinkedFile>(),
      {
        accessorKey: "name",
        header: "File",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-9 rounded-lg bg-muted grid place-items-center shrink-0">
              <FileText className="size-4 text-foreground/70" strokeWidth={2} />
            </span>
            <p className="text-sm font-medium text-foreground truncate">{row.original.name}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        filterFn: multiFilter as any,
        cell: ({ getValue }) => (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
            {CAT_LABEL[getValue<LinkedFile["category"]>()]}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {relativeDays(getValue<string>())}
          </span>
        ),
        sortingFn: (a, b, id) =>
          new Date(b.getValue<string>(id)).getTime() - new Date(a.getValue<string>(id)).getTime(),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: org.files,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: ((row: Row<LinkedFile>, _id: string, value: string) => {
      const v = value.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(v) ||
        CAT_LABEL[row.original.category].toLowerCase().includes(v)
      );
    }) as any,
    enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-3">
      {/* Toolbar: search on the left, filter + upload on the right */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search files…"
            className="pl-9 h-9 rounded-full bg-card border-border/60"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <FilterMenu table={table} />
          <SaltActionButton
            onClick={() => toast.success("Upload coming soon")}
            title="Salt will upload and link this file for you"
          >
            Upload file
          </SaltActionButton>
        </div>
      </div>


      {/* Floating bulk action dock */}
      {selectedRows.length > 0 && (
        <BulkActionDock>
          <div className={bulkActionDockPanelClassName()}>
            <span className="text-sm text-foreground/80">
              <span className="font-semibold tabular-nums">{selectedRows.length}</span>{" "}
              <span className="text-muted-foreground">selected</span>
            </span>
            <span className="h-5 w-px bg-border/70" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  toast(`Archived ${selectedRows.length}`);
                  setRowSelection({});
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-foreground/80 hover:bg-muted transition"
              >
                <Archive className="size-3.5" strokeWidth={2} />
                Archive
              </button>
              <button
                onClick={() => {
                  toast(`Unlinked ${selectedRows.length}`);
                  setRowSelection({});
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-foreground/80 hover:bg-muted transition"
              >
                <Link2Off className="size-3.5" strokeWidth={2} />
                Unlink
              </button>
              <button
                onClick={() => {
                  toast.error(`Deleted ${selectedRows.length}`);
                  setRowSelection({});
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-destructive hover:bg-destructive/10 transition"
              >
                <Trash2 className="size-3.5" strokeWidth={2} />
                Delete
              </button>
            </div>
            <button
              onClick={() => setRowSelection({})}
              className="ml-1 size-7 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
              aria-label="Clear selection"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        </BulkActionDock>
      )}

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent border-border/60">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-10 text-[11px] uppercase tracking-wider text-muted-foreground font-medium",
                        canSort && "cursor-pointer select-none",
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort &&
                            (dir === "asc" ? (
                              <ChevronUp className="size-3" strokeWidth={2.5} />
                            ) : dir === "desc" ? (
                              <ChevronDown className="size-3" strokeWidth={2.5} />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-50" strokeWidth={2} />
                            ))}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-border/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground text-sm"
                >
                  No files linked.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilterMenu({ table }: { table: TanstackTable<LinkedFile> }) {
  const activeCount = FILTERS.reduce((sum, f) => {
    const v = table.getColumn(f.columnId)?.getFilterValue() as string[] | undefined;
    return sum + (v?.length ?? 0);
  }, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 h-9 rounded-full border border-border/60 bg-card px-3 text-sm text-foreground/80 hover:border-border transition">
          <SlidersHorizontal className="size-4" strokeWidth={2} />
          Filter
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-foreground text-background text-[10px] font-semibold px-1">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Filter</p>
          {activeCount > 0 && (
            <button
              onClick={() =>
                FILTERS.forEach((f) => table.getColumn(f.columnId)?.setFilterValue(undefined))
              }
              className="text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              Clear all
            </button>
          )}
        </div>
        {FILTERS.map((f) => {
          const col = table.getColumn(f.columnId);
          const current = (col?.getFilterValue() as string[] | undefined) ?? [];
          return (
            <div key={f.columnId} className="p-2 border-b border-border/60 last:border-b-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                {f.label}
              </p>
              {f.options.map((opt) => {
                const checked = current.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-sm"
                  >
                    <Checkbox
                      className={memoryCheckboxClassName}
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = v
                          ? [...current, opt.value]
                          : current.filter((x) => x !== opt.value);
                        col?.setFilterValue(next.length ? next : undefined);
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
