"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Archive, Receipt, Sparkles, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { bulkArchive, bulkTrash } from "@/app/_features/memory/actions/trash";
import { MemoryTrashMenuLink } from "@/app/_features/memory/components/MemoryTrashMenuLink";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { billingRoutes } from "@/app/_features/shell/routes";
import { cn } from "@repo/utils";
import {
  BILLING_STATUS_LABEL,
  PAYABLE_CATEGORY_LABEL,
  formatBillingMoney,
  relativeDays,
  type BillingDirection,
  type BillingRecord,
} from "../data";
import { BILLING_STATUS_TONE } from "../utils/detail-mapper";
import { getBillingProviderDisplay } from "../utils/provider-display";
import { BillingSourceBadge } from "./BillingSourceBadge";

const multiFilter: FilterFn<BillingRecord> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

export function BillingDirectoryTable({
  direction,
  records,
}: {
  direction: BillingDirection;
  records: BillingRecord[];
}) {
  const router = useRouter();
  const data = records.filter((record) => record.direction === direction);
  const isReceivable = direction === "receivable";

  async function handleBulkArchive(selected: BillingRecord[], reset: () => void) {
    const result = await bulkArchive(
      selected.map((r) => ({ entityType: "billing" as const, id: r.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Archived ${selected.length} ${selected.length === 1 ? "record" : "records"}`,
    );
    reset();
    router.refresh();
  }

  async function handleBulkDelete(selected: BillingRecord[], reset: () => void) {
    const confirmed = window.confirm(
      `Move ${selected.length} ${selected.length === 1 ? "record" : "records"} to Trash?`,
    );
    if (!confirmed) return;
    const result = await bulkTrash(
      selected.map((r) => ({ entityType: "billing" as const, id: r.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Moved ${selected.length} ${selected.length === 1 ? "record" : "records"} to Trash`,
    );
    reset();
    router.refresh();
  }

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
      cell: ({ row, getValue }) => (
        <span className="text-sm tabular-nums text-foreground">
          {formatBillingMoney(getValue<number>(), row.original.currency)}
        </span>
      ),
      sortingFn: (a, b, id) => a.getValue<number>(id) - b.getValue<number>(id),
    },
    {
      accessorKey: "provider",
      header: "Source",
      filterFn: multiFilter,
      cell: ({ row }) => (
        <BillingSourceBadge
          provider={row.original.provider}
          source={row.original.source}
          origin={row.original.origin}
          sourceReclassifiedAsManual={row.original.sourceReclassifiedAsManual}
        />
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
              BILLING_STATUS_TONE[status]
            )}
          >
            {BILLING_STATUS_LABEL[status]}
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
      cell: ({ row, getValue }) => (
        <span className="text-sm tabular-nums text-foreground">
          {formatBillingMoney(getValue<number>(), row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "provider",
      header: "Source",
      filterFn: multiFilter,
      cell: ({ row }) => (
        <BillingSourceBadge
          provider={row.original.provider}
          source={row.original.source}
          origin={row.original.origin}
          sourceReclassifiedAsManual={row.original.sourceReclassifiedAsManual}
        />
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
              BILLING_STATUS_TONE[status]
            )}
          >
            {BILLING_STATUS_LABEL[status]}
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
            { value: "partial", label: "Partial" },
            { value: "refunded", label: "Refunded" },
            { value: "disputed", label: "Disputed" },
          ],
        },
        {
          columnId: "provider",
          label: "Source",
          options: Array.from(new Set(data.map((record) => record.provider))).map((provider) => ({
            value: provider,
            label: getBillingProviderDisplay(provider).label,
          })),
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
            { value: "draft", label: "Draft" },
            { value: "partial", label: "Partial" },
            { value: "refunded", label: "Refunded" },
            { value: "disputed", label: "Disputed" },
          ],
        },
        {
          columnId: "provider",
          label: "Source",
          options: Array.from(new Set(data.map((record) => record.provider))).map((provider) => ({
            value: provider,
            label: getBillingProviderDisplay(provider).label,
          })),
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

  if (data.length === 0) {
    return (
      <MockContentEmptyState
        title={isReceivable ? "No invoices yet" : "No payables yet"}
        description={
          isReceivable
            ? "Connect a finance app, add an invoice from Ask Salt, or upload a document to start Billing Memory."
            : "Record a bill manually or upload a payable document to track money going out."
        }
      />
    );
  }

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
          getBillingProviderDisplay(r.provider).label.toLowerCase().includes(v) ||
          BILLING_STATUS_LABEL[r.status].toLowerCase().includes(v) ||
          (r.org?.name.toLowerCase().includes(v) ?? false) ||
          (r.billTo?.name.toLowerCase().includes(v) ?? false) ||
          (r.vendorLabel?.toLowerCase().includes(v) ?? false) ||
          (r.payTo?.name.toLowerCase().includes(v) ?? false)
        );
      }}
      onRowClick={(record) => router.push(billingRoutes.detail(record.id))}
      displayMenuFooter={<MemoryTrashMenuLink entityType="billing" />}
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
            onClick={() => void handleBulkArchive(selected, reset)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-foreground/80 transition hover:bg-muted"
          >
            <Archive className="size-3.5" strokeWidth={2} />
            Archive
          </button>
          <button
            type="button"
            onClick={() => void handleBulkDelete(selected, reset)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
            Delete
          </button>
        </>
      )}
    />
  );
}
