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
  type FilterFn,
} from "@tanstack/react-table";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Receipt,
  Archive,
  Trash2,
  Link2Off,
  X,
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
import { cn } from "@repo/utils";
import type { Invoice } from "@/app/_lib/demo/people-demo-data";
import { formatMoney, relativeDays } from "@/app/_lib/demo/people-demo-data";
import { selectionColumn } from "./DataTable";
import { BulkActionDock, bulkActionDockPanelClassName } from "./BulkActionDock";
import { SaltActionButton } from "./SaltActionButton";

const STATUS_TONE = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  due: "bg-flame/10 text-flame border-flame/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border/60",
} as const;

const STATUS_LABEL: Record<Invoice["status"], string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  draft: "Draft",
};

const FILTERS = [
  {
    columnId: "status",
    label: "Status",
    options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
  },
];

const multiFilter: FilterFn<Invoice> = (row, id, value) => {
  const filterValues = value as string[] | undefined;
  return !filterValues?.length || filterValues.includes(row.getValue(id) as string);
};

type PaymentsTabContentProps = {
  invoices: Invoice[];
  retainerTier?: "Care" | "Essential" | "Growth" | "Scale";
  mrrCents?: number;
};

export function PaymentsTabContent({ invoices, retainerTier, mrrCents }: PaymentsTabContentProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "dueAt", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      selectionColumn<Invoice>(),
      {
        accessorKey: "number",
        header: "Invoice",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-9 rounded-lg bg-muted grid place-items-center shrink-0">
              <Receipt className="size-4 text-foreground/70" strokeWidth={2} />
            </span>
            <p className="text-sm font-medium text-foreground truncate">{row.original.number}</p>
          </div>
        ),
      },
      {
        accessorKey: "amountCents",
        header: "Amount",
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums text-foreground">{formatMoney(getValue<number>())}</span>
        ),
        sortingFn: (a, b, id) => a.getValue<number>(id) - b.getValue<number>(id),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: multiFilter,
        cell: ({ getValue }) => {
          const status = getValue<Invoice["status"]>();
          return (
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[status])}>
              {STATUS_LABEL[status]}
            </span>
          );
        },
      },
      {
        accessorKey: "dueAt",
        header: "Due",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.original.status === "due" || row.original.status === "overdue"
              ? `Due ${relativeDays(row.original.dueAt)}`
              : relativeDays(row.original.dueAt)}
          </span>
        ),
        sortingFn: (a, b, id) =>
          new Date(b.getValue<string>(id)).getTime() - new Date(a.getValue<string>(id)).getTime(),
      },
    ],
    []
  );

  const table = useReactTable({
    data: invoices,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _id, value) => {
      const v = String(value).toLowerCase();
      const inv = row.original;
      return (
        inv.number.toLowerCase().includes(v) ||
        STATUS_LABEL[inv.status].toLowerCase().includes(v) ||
        formatMoney(inv.amountCents).toLowerCase().includes(v)
      );
    },
    enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-5">
      {retainerTier && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Retainer tier</p>
            <p className="font-display text-2xl mt-1 tracking-tight">{retainerTier}</p>
          </div>
          {typeof mrrCents === "number" && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">MRR</p>
              <p className="font-display text-2xl mt-1 tabular-nums tracking-tight">{formatMoney(mrrCents)}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              value={globalFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
              placeholder="Search invoices…"
              className="pl-9 h-9 rounded-full bg-card border-border/60"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <FilterMenu table={table} />
            <SaltActionButton
              onClick={() => toast.success("Send invoice coming soon")}
              title="Salt will draft and send this invoice for you"
            >
              Send Invoice
            </SaltActionButton>
          </div>
        </div>

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
                  type="button"
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
                  type="button"
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
                  type="button"
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
                    className="border-border/60 cursor-pointer hover:bg-muted/50"
                    onClick={() => toast.info(`Billing detail for ${row.original.number} coming soon`)}
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
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                    {invoices.length ? "No invoices match your search." : "No invoices."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function FilterMenu({ table }: { table: TanstackTable<Invoice> }) {
  const activeCount = FILTERS.reduce((sum, f) => {
    const v = table.getColumn(f.columnId)?.getFilterValue() as string[] | undefined;
    return sum + (v?.length ?? 0);
  }, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 rounded-full border border-border/60 bg-card px-3 text-sm text-foreground/80 hover:border-border transition"
        >
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
              type="button"
              onClick={() => FILTERS.forEach((f) => table.getColumn(f.columnId)?.setFilterValue(undefined))}
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1">{f.label}</p>
              {f.options.map((opt) => {
                const checked = current.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-sm"
                  >
                    <Checkbox
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
