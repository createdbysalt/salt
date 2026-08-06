"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Sparkles, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { bulkArchive, bulkTrash } from "@/app/_features/memory/actions/trash";
import { MemoryTrashMenuLink } from "@/app/_features/memory/components/MemoryTrashMenuLink";
import { SignalPill } from "@/app/_features/memory/components/SignalPill";
import { SourceChip } from "@/app/_features/memory/components/SourceChip";
import { relativeDays, type Org } from "@/app/_lib/demo/orgs-demo-data";
import {
  getRelationshipLabel,
  getVocabularyOptions,
} from "@/app/_features/memory/taxonomy/registry";

const multiFilter = (row: any, id: string, value: string[]) =>
  !value?.length || value.includes(row.getValue(id));

export function OrgsDirectoryTable({ orgs }: { orgs: Org[] }) {
  const router = useRouter();

  async function handleBulkArchive(selected: Org[], reset: () => void) {
    const result = await bulkArchive(
      selected.map((o) => ({ entityType: "org" as const, id: o.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Archived ${selected.length} ${selected.length === 1 ? "organization" : "organizations"}`,
    );
    reset();
    router.refresh();
  }

  async function handleBulkDelete(selected: Org[], reset: () => void) {
    const confirmed = window.confirm(
      `Move ${selected.length} ${selected.length === 1 ? "organization" : "organizations"} to Trash?`,
    );
    if (!confirmed) return;
    const result = await bulkTrash(
      selected.map((o) => ({ entityType: "org" as const, id: o.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Moved ${selected.length} ${selected.length === 1 ? "organization" : "organizations"} to Trash`,
    );
    reset();
    router.refresh();
  }

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
      cell: ({ getValue }) => (
        <span className="text-sm text-foreground/80">{getRelationshipLabel(getValue<string>())}</span>
      ),
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
        <span className="text-sm text-muted-foreground tabular-nums">{relativeDays(getValue<string | null>())}</span>
      ),
      sortingFn: (a, b, id) =>
        new Date(b.getValue<string | null>(id) ?? 0).getTime() -
        new Date(a.getValue<string | null>(id) ?? 0).getTime(),
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
      options: getVocabularyOptions("relationship_type", "org"),
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
      displayMenuFooter={<MemoryTrashMenuLink entityType="org" />}
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
            type="button"
            onClick={() => void handleBulkArchive(selected, reset)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-foreground/80 hover:bg-muted transition"
          >
            <Archive className="size-3.5" strokeWidth={2} />
            Archive
          </button>
          <button
            type="button"
            onClick={() => void handleBulkDelete(selected, reset)}
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
