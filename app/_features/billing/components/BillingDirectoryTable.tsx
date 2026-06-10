"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Archive, Receipt, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { cn } from "@repo/utils";
import {
  PAYABLE_CATEGORY_LABEL,
  billingRecordsForDirection,
  formatMoney,
  relativeDays,
  type BillingDirection,
  type BillingRecord,
} from "../data";

const multiFilter: FilterFn<BillingRecord> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

const STATUS_TONE: Record<BillingRecord["status"], string> = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  due: "bg-flame/10 text-flame border-flame/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border/60",
};

const STATUS_LABEL: Record<BillingRecord["status"], string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  draft: "Draft",
};

export function BillingDirectoryTable({
  direction,
  extraRecords = [],
}: {
  direction: BillingDirection;
  extraRecords?: BillingRecord[];
}) {
  const data = [
    ...extraRecords.filter((r) => r.direction === direction),
    ...billingRecordsForDirection(direction),
  ];
  const isReceivable = direction === "receivable";

  const receivableColumns: ColumnDef<BillingRecord>[] = [
    selectionColumn<BillingRecord>(),
    {
      accessorKey: "number",
      header: "Invoice",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground/8 text-foreground">
            <Receipt className="size-3.5" strokeWidth={2.25} />
          </div>
          <p className="truncate text-sm font-medium text-foreground">{row.original.number}</p>
        </div>
      ),
    },
    {
      id: "org",
      accessorFn: (record) => record.org?.name ?? "",
      header: "Organization",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">{row.original.org?.name ?? "—"}</span>
      ),
    },
    {
      id: "billTo",
      accessorFn: (record) => record.billTo?.name ?? "",
      header: "Bill to",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">{row.original.billTo?.name ?? "—"}</span>
      ),
    },
    {
      accessorKey: "amountCents",
      header: "Amount",
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-foreground">
          {formatMoney(getValue<number>())}
        </span>
      ),
      sortingFn: (a, b, id) => a.getValue<number>(id) - b.getValue<number>(id),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const status = getValue<BillingRecord["status"]>();
        return (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              STATUS_TONE[status]
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        );
      },
    },
    {
      accessorKey: "dueAt",
      header: "Due",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original.status === "due" || row.original.status === "overdue"
            ? `Due ${relativeDays(row.original.dueAt)}`
            : relativeDays(row.original.dueAt)}
        </span>
      ),
      sortingFn: (a, b, id) =>
        new Date(b.getValue<string>(id)).getTime() - new Date(a.getValue<string>(id)).getTime(),
    },
  ];

  const payableColumns: ColumnDef<BillingRecord>[] = [
    selectionColumn<BillingRecord>(),
    {
      accessorKey: "number",
      header: "Bill",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground/8 text-foreground">
            <Wallet className="size-3.5" strokeWidth={2.25} />
          </div>
          <p className="truncate text-sm font-medium text-foreground">{row.original.number}</p>
        </div>
      ),
    },
    {
      id: "vendor",
      accessorFn: (record) => record.vendorLabel ?? record.payTo?.name ?? "",
      header: "Vendor",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">
          {row.original.vendorLabel ?? row.original.payTo?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const cat = getValue<BillingRecord["category"]>();
        return (
          <span className="text-sm text-foreground/80">
            {cat ? PAYABLE_CATEGORY_LABEL[cat] : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "amountCents",
      header: "Amount",
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-foreground">
          {formatMoney(getValue<number>())}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const status = getValue<BillingRecord["status"]>();
        return (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              STATUS_TONE[status]
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        );
      },
    },
    {
      accessorKey: "dueAt",
      header: "Due",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {relativeDays(row.original.dueAt)}
        </span>
      ),
    },
  ];

  const columns = isReceivable ? receivableColumns : payableColumns;

  const filters = isReceivable
    ? [
        {
          columnId: "status",
          label: "Status",
          options: [
            { value: "paid", label: "Paid" },
            { value: "due", label: "Due" },
            { value: "overdue", label: "Overdue" },
            { value: "draft", label: "Draft" },
          ],
        },
      ]
    : [
        {
          columnId: "status",
          label: "Status",
          options: [
            { value: "paid", label: "Paid" },
            { value: "due", label: "Due" },
            { value: "overdue", label: "Overdue" },
          ],
        },
        {
          columnId: "category",
          label: "Category",
          options: Object.entries(PAYABLE_CATEGORY_LABEL).map(([value, label]) => ({
            value,
            label,
          })),
        },
      ];

  return (
    <DataTable
      data={data}
      columns={columns}
      filters={filters}
      searchPlaceholder={isReceivable ? "Search invoices, orgs, people…" : "Search bills, vendors…"}
      globalFilterFn={(row, _id, value) => {
        const v = String(value).toLowerCase();
        const r = row.original;
        return (
          r.number.toLowerCase().includes(v) ||
          (r.org?.name.toLowerCase().includes(v) ?? false) ||
          (r.billTo?.name.toLowerCase().includes(v) ?? false) ||
          (r.vendorLabel?.toLowerCase().includes(v) ?? false) ||
          (r.payTo?.name.toLowerCase().includes(v) ?? false)
        );
      }}
      onRowClick={(record) => toast(`Billing detail for ${record.number} (coming soon)`)}
      bulkActions={(selected, reset) => (
        <>
          <button
            type="button"
            onClick={() => {
              toast.success(`Draft follow-ups for ${selected.length}`);
              reset();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            <Sparkles className="size-3.5" strokeWidth={2.5} />
            Draft follow-up
          </button>
          <button
            type="button"
            onClick={() => {
              toast(`Archived ${selected.length}`);
              reset();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-foreground/80 transition hover:bg-muted"
          >
            <Archive className="size-3.5" strokeWidth={2} />
            Archive
          </button>
        </>
      )}
    />
  );
}
