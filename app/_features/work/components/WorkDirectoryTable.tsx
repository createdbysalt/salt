"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Archive, Briefcase, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { SignalPill } from "@/app/_features/memory/components/SignalPill";
import { SourceChip } from "@/app/_features/memory/components/SourceChip";
import { WORK_ITEMS, relativeDays, type WorkItem } from "../data";

const multiFilter: FilterFn<WorkItem> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

const STATUS_TONE: Record<WorkItem["status"], string> = {
  Active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Renewing: "bg-flame/12 text-flame",
  Stalled: "bg-destructive/10 text-destructive",
  Wrapping: "bg-muted text-muted-foreground",
};

export function WorkDirectoryTable() {
  const columns: ColumnDef<WorkItem>[] = [
    selectionColumn<WorkItem>(),
    {
      accessorKey: "title",
      header: "Work",
      cell: ({ row }) => {
        const work = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Briefcase className="size-3.5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{work.title}</p>
              <div className="mt-1.5 h-1 max-w-[120px] overflow-hidden rounded-full bg-muted">
                <div className="surface-aurora h-full" style={{ width: `${work.progress}%` }} />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "org",
      accessorFn: (work) => work.org?.name ?? "",
      header: "Organization",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">{row.original.org?.name ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const status = getValue<WorkItem["status"]>();
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_TONE[status]
            )}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-foreground/80">{getValue<number>()}%</span>
      ),
    },
    {
      accessorKey: "contactCount",
      header: "Contacts",
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-foreground/80">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: "lastActivityAt",
      header: "Last activity",
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {relativeDays(getValue<string>())}
        </span>
      ),
      sortingFn: (a, b, id) =>
        new Date(b.getValue<string>(id)).getTime() - new Date(a.getValue<string>(id)).getTime(),
    },
    {
      id: "signals",
      header: "Signals",
      enableSorting: false,
      filterFn: (row, _id, value) => {
        const filters = value as string[] | undefined;
        if (!filters?.length) return true;
        return row.original.signals.some((s) => filters.includes(s.kind));
      },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.signals.length ? (
            row.original.signals.map((signal) => (
              <SignalPill key={signal.kind} signal={signal} />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      filterFn: multiFilter,
      cell: ({ row }) => <SourceChip source={row.original.source} />,
    },
  ];

  const filters = [
    {
      columnId: "status",
      label: "Status",
      options: [
        { value: "Active", label: "Active" },
        { value: "Stalled", label: "Stalled" },
        { value: "Renewing", label: "Renewing" },
        { value: "Wrapping", label: "Wrapping" },
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
      data={WORK_ITEMS}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search work, orgs, tags…"
      globalFilterFn={(row, _id, value) => {
        const v = value.toLowerCase();
        const work = row.original;
        return (
          work.title.toLowerCase().includes(v) ||
          (work.org?.name.toLowerCase().includes(v) ?? false) ||
          work.tags.some((tag) => tag.toLowerCase().includes(v))
        );
      }}
      onRowClick={(work) => toast(`Work detail for “${work.title}” (coming soon)`)}
      bulkActions={(selected, reset) => (
        <>
          <button
            type="button"
            onClick={() => {
              toast.success(`Added ${selected.length} to Play`);
              reset();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            <Sparkles className="size-3.5" strokeWidth={2.5} />
            Add to Play
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
          <button
            type="button"
            onClick={() => {
              toast.error(`Deleted ${selected.length}`);
              reset();
            }}
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
