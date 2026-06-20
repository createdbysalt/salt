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
  type VisibilityState,
  type RowSelectionState,
  type Table as TanstackTable,
  type Row,
  type FilterFn,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Settings2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
import { cn } from "@repo/utils";
import { BulkActionDock, bulkActionDockPanelClassName } from "./BulkActionDock";

export const memoryCheckboxClassName = "rounded-full";

export type DataTableFilter = {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
};

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  globalFilterFn?: FilterFn<TData>;
  onRowClick?: (row: TData) => void;
  bulkActions?: (selected: TData[], reset: () => void) => React.ReactNode;
  toolbarRight?: React.ReactNode;
  filters?: DataTableFilter[];
};

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search…",
  globalFilterFn,
  onRowClick,
  bulkActions,
  toolbarRight,
  filters,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
    enableRowSelection: !!bulkActions,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={globalFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-9 rounded-full bg-card border-border/60"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {toolbarRight}
          <ColumnVisibilityMenu table={table} />
          <FilterMenu table={table} filters={filters} />
        </div>
      </div>

      {bulkActions && selectedRows.length > 0 && (
        <BulkActionDock>
          <div className={bulkActionDockPanelClassName()}>
            <span className="text-sm text-foreground/80">
              <span className="font-semibold tabular-nums">{selectedRows.length}</span>{" "}
              <span className="text-muted-foreground">selected</span>
            </span>
            <span className="h-5 w-px bg-border/70" />
            <div className="flex items-center gap-1">{bulkActions(selectedRows, () => setRowSelection({}))}</div>
            <button
              type="button"
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
                        canSort && "cursor-pointer select-none"
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
                  onClick={() => onRowClick?.(row.original)}
                  className={cn("border-border/60", onRowClick && "cursor-pointer hover:bg-muted/50")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-3"
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) => {
                        if ((e.target as HTMLElement).closest("button, a, input, [role='checkbox']")) {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Radix popovers generate unstable ids during SSR — render after hydration. */
function useClientMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

const toolbarMenuButtonClass =
  "inline-flex items-center gap-1.5 h-9 rounded-full border border-border/60 bg-card px-3 text-sm text-foreground/80 hover:border-border transition";

function FilterMenu<TData>({
  table,
  filters,
}: {
  table: TanstackTable<TData>;
  filters?: DataTableFilter[];
}) {
  const mounted = useClientMounted();
  const activeCount = (filters ?? []).reduce((sum, f) => {
    const v = table.getColumn(f.columnId)?.getFilterValue() as string[] | undefined;
    return sum + (v?.length ?? 0);
  }, 0);

  if (!filters || filters.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 h-9 rounded-full border border-border/60 bg-card px-3 text-sm text-muted-foreground/60 cursor-not-allowed"
      >
        <SlidersHorizontal className="size-4" strokeWidth={2} />
        Filter
      </button>
    );
  }

  const filterTrigger = (
    <button type="button" className={toolbarMenuButtonClass}>
      <SlidersHorizontal className="size-4" strokeWidth={2} />
      Filter
      {activeCount > 0 && (
        <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-foreground text-background text-[10px] font-semibold px-1">
          {activeCount}
        </span>
      )}
    </button>
  );

  if (!mounted) {
    return filterTrigger;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{filterTrigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Filter</p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => filters.forEach((f) => table.getColumn(f.columnId)?.setFilterValue(undefined))}
              className="text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              Clear all
            </button>
          )}
        </div>
        {filters.map((f) => {
          const col = table.getColumn(f.columnId);
          const current = (col?.getFilterValue() as string[] | undefined) ?? [];
          return (
            <div key={f.columnId} className="p-2 border-b border-border/60 last:border-b-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1">{f.label}</p>
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
                      onCheckedChange={(v: boolean | "indeterminate") => {
                        const next = v === true ? [...current, opt.value] : current.filter((x) => x !== opt.value);
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

function ColumnVisibilityMenu<TData>({ table }: { table: TanstackTable<TData> }) {
  const mounted = useClientMounted();

  const displayTrigger = (
    <button type="button" className={toolbarMenuButtonClass}>
      <Settings2 className="size-4" strokeWidth={2} />
      Display
    </button>
  );

  if (!mounted) {
    return displayTrigger;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{displayTrigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1">Toggle columns</p>
        {table
          .getAllColumns()
          .filter((c) => c.getCanHide())
          .map((column) => (
            <label
              key={column.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-sm"
            >
              <Checkbox
                className={memoryCheckboxClassName}
                checked={column.getIsVisible()}
                onCheckedChange={(v: boolean | "indeterminate") => column.toggleVisibility(v === true)}
              />
              <span className="capitalize">{column.id.replace(/_/g, " ")}</span>
            </label>
          ))}
      </PopoverContent>
    </Popover>
  );
}

export function selectionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        className={memoryCheckboxClassName}
        checked={
          table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false
        }
        onCheckedChange={(v: boolean | "indeterminate") => table.toggleAllRowsSelected(v === true)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        className={memoryCheckboxClassName}
        checked={row.getIsSelected()}
        onCheckedChange={(v: boolean | "indeterminate") => row.toggleSelected(v === true)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  };
}
