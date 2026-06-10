"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Sparkles, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { SignalPill } from "@/app/_features/memory/components/SignalPill";
import { SourceChip } from "@/app/_features/memory/components/SourceChip";
import { relativeDays, type Org } from "@/app/_lib/demo/orgs-demo-data";

const multiFilter = (row: any, id: string, value: string[]) =>
  !value?.length || value.includes(row.getValue(id));

export function OrgsDirectoryTable() {
  const router = useRouter();
  const orgs: Org[] = [];

  const columns: ColumnDef<Org>[] = [
    selectionColumn<Org>(),
    {
      accessorKey: "name",
      header: "Organization",
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-xl bg-foreground text-background grid place-items-center text-xs font-semibold shrink-0">
              {o.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
              {o.industry && <p className="text-xs text-muted-foreground truncate">{o.industry}</p>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "relationship",
      header: "Relationship",
      filterFn: multiFilter as any,
      cell: ({ getValue }) => <span className="text-sm text-foreground/80">{getValue<string>()}</span>,
    },
    {
      accessorKey: "lifecycle",
      header: "Stage",
      filterFn: multiFilter as any,
      cell: ({ getValue }) => (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "contactCount",
      header: "Contacts",
      cell: ({ getValue }) => (
        <span className="text-sm text-foreground/80 tabular-nums">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: "lastContactAt",
      header: "Last contact",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground tabular-nums">{relativeDays(getValue<string>())}</span>
      ),
      sortingFn: (a, b, id) =>
        new Date(b.getValue<string>(id)).getTime() - new Date(a.getValue<string>(id)).getTime(),
    },
    {
      id: "signals",
      header: "Signals",
      enableSorting: false,
      filterFn: ((row: any, _id: string, value: string[]) =>
        !value?.length ||
        row.original.signals.some((s: { kind: string }) => value.includes(s.kind))) as any,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.signals.length ? (
            row.original.signals.map((s) => <SignalPill key={s.kind} signal={s} />)
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      filterFn: multiFilter as any,
      cell: ({ row }) => <SourceChip source={row.original.source} />,
    },
  ];

  const filters = [
    {
      columnId: "relationship",
      label: "Relationship",
      options: [
        { value: "Client", label: "Client" },
        { value: "Prospect", label: "Prospect" },
        { value: "Partner", label: "Partner" },
        { value: "Vendor", label: "Vendor" },
        { value: "Internal", label: "Internal" },
        { value: "Past client", label: "Past client" },
      ],
    },
    {
      columnId: "lifecycle",
      label: "Stage",
      options: [
        { value: "New", label: "New" },
        { value: "Active", label: "Active" },
        { value: "At risk", label: "At risk" },
        { value: "Renewing", label: "Renewing" },
        { value: "Dormant", label: "Dormant" },
        { value: "Past", label: "Past" },
      ],
    },
    {
      columnId: "signals",
      label: "Signals",
      options: [
        { value: "payment_due", label: "Payment due" },
        { value: "quiet", label: "Gone quiet" },
        { value: "active_work", label: "Active work" },
        { value: "meeting_soon", label: "Meeting soon" },
        { value: "renewal_risk", label: "Renewal risk" },
      ],
    },
    {
      columnId: "source",
      label: "Source",
      options: [
        { value: "user", label: "Added by you" },
        { value: "imported", label: "Imported" },
        { value: "salt_inferred", label: "Inferred by Salt" },
      ],
    },
  ];

  return (
    <DataTable
      data={orgs}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search orgs, industries, tags…"
      globalFilterFn={(row, _id, value) => {
        const v = value.toLowerCase();
        const o = row.original;
        return (
          o.name.toLowerCase().includes(v) ||
          (o.industry?.toLowerCase().includes(v) ?? false) ||
          (o.website?.toLowerCase().includes(v) ?? false) ||
          o.tags.some((t) => t.toLowerCase().includes(v))
        );
      }}
      onRowClick={(org) => router.push(`/orgs/${org.id}`)}
      bulkActions={(selected, reset) => (
        <>
          <button
            onClick={() => {
              toast.success(`Added ${selected.length} to Play`);
              reset();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition"
          >
            <Sparkles className="size-3.5" strokeWidth={2.5} />
            Add to Play
          </button>
          <button
            onClick={() => {
              toast(`Archived ${selected.length}`);
              reset();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-foreground/80 hover:bg-muted transition"
          >
            <Archive className="size-3.5" strokeWidth={2} />
            Archive
          </button>
          <button
            onClick={() => {
              toast.error(`Deleted ${selected.length}`);
              reset();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
            Delete
          </button>
        </>
      )}
    />
  );
}
