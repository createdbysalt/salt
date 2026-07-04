"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import type { ColumnDef, ColumnFiltersState, FilterFn } from "@tanstack/react-table";
import {
  Archive,
  Briefcase,
  Building2,
  FileText,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { cn } from "@repo/utils";
import { relativeDays } from "@/app/_lib/demo/people-demo-data";
import {
  bulkDeleteForever,
  bulkRestoreFromArchive,
  bulkRestoreFromTrash,
  bulkTrashFromArchive,
} from "../actions/trash";
import {
  daysUntilPurge,
  TRASH_ENTITY_LABELS,
  type TrashEntityType,
  type MemoryTrashItem,
} from "../types/trash";
import type { MemoryViewMode } from "./MemoryViewToggle";

const ENTITY_ICONS: Record<
  TrashEntityType,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  person: User,
  org: Building2,
  work: Briefcase,
  note: FileText,
};

const multiFilter: FilterFn<MemoryTrashItem> = (row, id, value) => {
  const filterValues = value as string[] | undefined;
  return !filterValues?.length || filterValues.includes(row.getValue(id) as string);
};

function countForEntity(items: MemoryTrashItem[], entityType?: TrashEntityType): number {
  if (!entityType) return items.length;
  return items.filter((item) => item.entityType === entityType).length;
}

interface TrashDirectoryTableProps {
  archivedItems: MemoryTrashItem[];
  trashItems: MemoryTrashItem[];
  initialEntityFilter?: TrashEntityType;
}

export function TrashDirectoryTable({
  archivedItems,
  trashItems,
  initialEntityFilter,
}: TrashDirectoryTableProps) {
  const router = useRouter();
  // Default to whichever view has items, preferring Trash (the more common action)
  // so freshly deleted items are visible without hunting for the status toggle.
  const defaultView: MemoryViewMode = React.useMemo(() => {
    const relevantTrash = initialEntityFilter
      ? trashItems.filter((i) => i.entityType === initialEntityFilter)
      : trashItems;
    const relevantArchived = initialEntityFilter
      ? archivedItems.filter((i) => i.entityType === initialEntityFilter)
      : archivedItems;
    if (relevantTrash.length > 0) return "trash";
    if (relevantArchived.length > 0) return "archived";
    return "archived";
  }, [archivedItems, trashItems, initialEntityFilter]);
  const [view, setView] = React.useState<MemoryViewMode>(defaultView);

  const isArchived = view === "archived";
  const items = isArchived ? archivedItems : trashItems;

  const initialColumnFilters = React.useMemo<ColumnFiltersState>(
    () =>
      initialEntityFilter
        ? [{ id: "entityType", value: [initialEntityFilter] }]
        : [],
    [initialEntityFilter],
  );

  const viewToggleSection = {
    label: "Status",
    content: (
      <>
        {(["archived", "trash"] as const).map((mode) => {
          const count =
            mode === "archived"
              ? countForEntity(archivedItems, initialEntityFilter)
              : countForEntity(trashItems, initialEntityFilter);
          const selected = view === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60",
                selected && "bg-muted/60 font-medium text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border border-border/80",
                  selected && "border-foreground",
                )}
              >
                {selected ? <span className="size-2 rounded-full bg-foreground" /> : null}
              </span>
              <span className="flex-1">{mode === "archived" ? "Archived" : "Trash"}</span>
              {count > 0 ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </>
    ),
  };

  const columns: ColumnDef<MemoryTrashItem, unknown>[] = [
    selectionColumn<MemoryTrashItem>(),
    {
      accessorKey: "label",
      header: "Item",
      cell: ({ row }) => {
        const item = row.original;
        const Icon = ENTITY_ICONS[item.entityType];
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-full bg-muted text-foreground grid place-items-center shrink-0">
              <Icon className="size-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
              {item.sublabel ? (
                <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "entityType",
      header: "Type",
      filterFn: multiFilter,
      cell: ({ getValue }) => (
        <span className="text-sm text-foreground/80">
          {TRASH_ENTITY_LABELS[getValue<TrashEntityType>()]}
        </span>
      ),
    },
    {
      id: "removedBy",
      header: "Removed by",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.deletedByName ?? "—"}
        </span>
      ),
    },
    {
      id: "date",
      header: isArchived ? "Archived" : "Deletes in",
      cell: ({ row }) => {
        const item = row.original;
        if (isArchived && item.archivedAt) {
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {relativeDays(item.archivedAt)}
            </span>
          );
        }
        if (!isArchived && item.deletedAt) {
          const days = daysUntilPurge(item.deletedAt);
          return (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80 tabular-nums">
              {days === 0 ? "Today" : `${days}d`}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
      sortingFn: (a, b) => {
        const aDate = isArchived ? a.original.archivedAt : a.original.deletedAt;
        const bDate = isArchived ? b.original.archivedAt : b.original.deletedAt;
        return (bDate ?? "").localeCompare(aDate ?? "");
      },
    },
  ];

  const filters = [
    {
      columnId: "entityType",
      label: "Type",
      options: (Object.keys(TRASH_ENTITY_LABELS) as TrashEntityType[]).map((type) => ({
        value: type,
        label: TRASH_ENTITY_LABELS[type],
      })),
    },
  ];

  const globalFilterFn: FilterFn<MemoryTrashItem> = (row, _id, value) => {
    const v = String(value).toLowerCase();
    const item = row.original;
    return (
      item.label.toLowerCase().includes(v) ||
      (item.sublabel?.toLowerCase().includes(v) ?? false) ||
      TRASH_ENTITY_LABELS[item.entityType].toLowerCase().includes(v)
    );
  };

  async function handleBulkRestore(selected: MemoryTrashItem[], reset: () => void) {
    const payload = selected.map((item) => ({
      entityType: item.entityType,
      id: item.id,
    }));
    const result = isArchived
      ? await bulkRestoreFromArchive(payload)
      : await bulkRestoreFromTrash(payload);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`Restored ${selected.length} item${selected.length === 1 ? "" : "s"}`);
    reset();
    router.refresh();
  }

  async function handleBulkDelete(selected: MemoryTrashItem[], reset: () => void) {
    if (isArchived) {
      const result = await bulkTrashFromArchive(
        selected.map((item) => ({ entityType: item.entityType, id: item.id })),
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moved ${selected.length} item${selected.length === 1 ? "" : "s"} to Trash`);
      reset();
      router.refresh();
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${selected.length} item${selected.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;

    const result = await bulkDeleteForever(
      selected.map((item) => ({ entityType: item.entityType, id: item.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Permanently deleted ${selected.length} item${selected.length === 1 ? "" : "s"}`);
    reset();
    router.refresh();
  }

  return (
    <DataTable
      data={items}
      columns={columns}
      filters={filters}
      customFilterSections={[viewToggleSection]}
      initialColumnFilters={initialColumnFilters}
      searchPlaceholder="Search archived and deleted items…"
      globalFilterFn={globalFilterFn}
      bulkActions={(selected, reset) => (
        <>
          <button
            type="button"
            onClick={() => void handleBulkRestore(selected, reset)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.5} />
            Restore
          </button>
          {isArchived ? (
            <button
              type="button"
              onClick={() => void handleBulkDelete(selected, reset)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-destructive hover:bg-destructive/10 transition"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
              Delete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleBulkDelete(selected, reset)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-destructive hover:bg-destructive/10 transition"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
              Delete forever
            </button>
          )}
          {isArchived ? (
            <span className="inline-flex items-center gap-1.5 h-9 px-3 text-xs text-muted-foreground">
              <Archive className="size-3.5" strokeWidth={2} />
              Archive keeps items until you delete them
            </span>
          ) : null}
        </>
      )}
    />
  );
}
