"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Archive, Sparkles, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { cn } from "@repo/utils";
import {
  ACCESS_META,
  ALL_TEAM,
  WORKSPACE_ROLE_META,
  relativeActive,
  type TeamMember,
} from "../workspace-data";

const multiFilter: FilterFn<TeamMember> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

export function TeamsMemoryDirectoryTable() {
  const router = useRouter();

  const columns: ColumnDef<TeamMember>[] = [
    selectionColumn<TeamMember>(),
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "size-8 rounded-full grid place-items-center text-xs font-semibold shrink-0",
                m.isOwner
                  ? "surface-aurora text-white"
                  : "bg-foreground text-background",
              )}
            >
              {m.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
              <p className="text-xs text-muted-foreground truncate">{m.title}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "workspaceRole",
      header: "Role",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const role = getValue<TeamMember["workspaceRole"]>();
        const meta = WORKSPACE_ROLE_META[role];
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              meta.tone,
            )}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      id: "owns",
      header: "Owns",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80 line-clamp-2">
          {row.original.owns.join(" · ")}
        </span>
      ),
    },
    {
      accessorKey: "playsRouted",
      header: "Plays",
      cell: ({ getValue }) => {
        const n = getValue<number>();
        return (
          <span className="text-sm tabular-nums text-foreground/80">
            {n > 0 ? n : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "lastActiveAt",
      header: "Last active",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {relativeActive(getValue<string>())}
        </span>
      ),
      sortingFn: (a, b, id) =>
        new Date(b.getValue<string>(id)).getTime() -
        new Date(a.getValue<string>(id)).getTime(),
    },
    {
      accessorKey: "access",
      header: "Access",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const access = getValue<TeamMember["access"]>();
        const meta = ACCESS_META[access];
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              meta.tone,
            )}
          >
            {meta.label}
          </span>
        );
      },
    },
  ];

  const filters = [
    {
      columnId: "workspaceRole",
      label: "Role",
      options: [
        { value: "Owner", label: "Owner" },
        { value: "Operator", label: "Operator" },
        { value: "Counsel", label: "Counsel" },
        { value: "Finance", label: "Finance" },
      ],
    },
    {
      columnId: "access",
      label: "Access",
      options: [
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited" },
        { value: "away", label: "Away" },
      ],
    },
  ];

  return (
    <DataTable
      data={ALL_TEAM}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search teammates, roles, ownership…"
      globalFilterFn={(row, _id, value) => {
        const v = String(value).toLowerCase();
        const m = row.original;
        return (
          m.name.toLowerCase().includes(v) ||
          m.title.toLowerCase().includes(v) ||
          m.workspaceRole.toLowerCase().includes(v) ||
          m.owns.some((o) => o.toLowerCase().includes(v)) ||
          (m.email?.toLowerCase().includes(v) ?? false)
        );
      }}
      onRowClick={(m) => {
        if (m.isOwner) {
          router.push("/me");
          return;
        }
        if (m.personId) {
          router.push(`/people/${m.personId}`);
          return;
        }
        toast(`${m.name} — teammate profile (coming soon)`);
      }}
      bulkActions={(selected, reset) => (
        <>
          <button
            type="button"
            onClick={() => {
              toast.success(`Routed play to ${selected.length} teammate${selected.length === 1 ? "" : "s"}`);
              reset();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition"
          >
            <Sparkles className="size-3.5" strokeWidth={2.5} />
            Route play
          </button>
          <button
            type="button"
            onClick={() => {
              toast(`Resent invite to ${selected.length}`);
              reset();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-foreground/80 hover:bg-muted transition"
          >
            <UserPlus className="size-3.5" strokeWidth={2} />
            Resend invite
          </button>
          <button
            type="button"
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
            type="button"
            onClick={() => {
              toast.error(`Removed ${selected.length} from workspace`);
              reset();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
            Remove
          </button>
        </>
      )}
    />
  );
}
