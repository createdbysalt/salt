"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Archive, Calendar, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { cn } from "@repo/utils";
import {
  MEETINGS,
  SIGNAL_META,
  SOURCE_META,
  STATUS_META,
  formatMeetingTime,
  relativeMeetingTime,
  type MeetingDetail,
} from "../data";

const multiFilter: FilterFn<MeetingDetail> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

export function MeetingsDirectoryTable() {
  const columns: ColumnDef<MeetingDetail>[] = [
    selectionColumn<MeetingDetail>(),
    {
      accessorKey: "title",
      header: "Meeting",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Calendar className="size-3.5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.org?.name ? `${m.org.name} · ` : ""}
                {m.location}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "startAt",
      header: "When",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="text-sm">
            <p className="tabular-nums text-foreground/90">
              {formatMeetingTime(m.startAt, m.endAt)}
            </p>
            <p className="text-xs text-muted-foreground">{relativeMeetingTime(m.startAt)}</p>
          </div>
        );
      },
      sortingFn: (a, b, id) =>
        new Date(a.getValue<string>(id)).getTime() - new Date(b.getValue<string>(id)).getTime(),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const status = getValue<MeetingDetail["status"]>();
        const meta = STATUS_META[status];
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              meta.tone
            )}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      id: "participants",
      header: "Who",
      enableSorting: false,
      cell: ({ row }) => {
        const m = row.original;
        const externals = m.participants.filter((p) => p.external);
        const lead = externals[0] ?? m.participants.find((p) => p.id !== "me");
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <Users className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="truncate text-sm text-foreground/80">
              {lead?.name ?? "—"}
              {m.participants.length > 2 && (
                <span className="text-muted-foreground"> +{m.participants.length - 1}</span>
              )}
            </span>
          </div>
        );
      },
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
            row.original.signals.map((s) => (
              <span
                key={s.kind}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  SIGNAL_META[s.kind].tone
                )}
              >
                {s.label}
              </span>
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
      cell: ({ getValue }) => {
        const src = getValue<MeetingDetail["source"]>();
        const meta = SOURCE_META[src];
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              meta.tone
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
      columnId: "status",
      label: "Status",
      options: [
        { value: "upcoming", label: "Upcoming" },
        { value: "live", label: "Live" },
        { value: "past", label: "Past" },
        { value: "canceled", label: "Canceled" },
      ],
    },
    {
      columnId: "signals",
      label: "Signals",
      options: [
        { value: "prep_ready", label: "Prep ready" },
        { value: "needs_recap", label: "Needs recap" },
        { value: "decisions_logged", label: "Decisions logged" },
        { value: "follow_up_due", label: "Follow-up due" },
        { value: "no_recording", label: "No recording" },
      ],
    },
    {
      columnId: "source",
      label: "Source",
      options: [
        { value: "google_calendar", label: "Google Calendar" },
        { value: "zoom", label: "Zoom" },
        { value: "granola", label: "Granola" },
        { value: "fathom", label: "Fathom" },
        { value: "otter", label: "Otter" },
        { value: "manual", label: "Manual" },
      ],
    },
  ];

  return (
    <DataTable
      data={MEETINGS}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search meetings, people, orgs…"
      globalFilterFn={(row, _id, value) => {
        const v = String(value).toLowerCase();
        const m = row.original;
        return (
          m.title.toLowerCase().includes(v) ||
          (m.org?.name.toLowerCase().includes(v) ?? false) ||
          m.participants.some((p) => p.name.toLowerCase().includes(v)) ||
          m.location.toLowerCase().includes(v)
        );
      }}
      onRowClick={() => toast("Meeting detail view (coming soon)")}
      bulkActions={(selected, reset) => (
        <>
          <button
            type="button"
            onClick={() => {
              toast.success(`Draft recaps for ${selected.length}`);
              reset();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            <Sparkles className="size-3.5" strokeWidth={2.5} />
            Draft recap
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
