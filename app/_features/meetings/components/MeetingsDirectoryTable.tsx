"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { format, parseISO, formatDistanceToNow, isBefore, isAfter } from "date-fns";
import { Archive, Calendar, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { cn } from "@repo/utils";
import type { MeetingDetailRecord } from "../queries";

type MeetingStatus = "upcoming" | "live" | "past" | "cancelled";

type MeetingTableRow = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  locationType: string;
  clientName?: string;
  projectName?: string;
  attendees: { name: string; role: string }[];
  origin?: string;
};

const STATUS_META: Record<MeetingStatus, { label: string; tone: string }> = {
  upcoming: { label: "Upcoming", tone: "bg-sky/10 text-sky" },
  live: { label: "Live", tone: "bg-success/10 text-success" },
  past: { label: "Completed", tone: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
};

const SOURCE_META: Record<string, { label: string; tone: string }> = {
  "google-calendar": { label: "Google Calendar", tone: "border-border/60 text-foreground/70" },
  zoom: { label: "Zoom", tone: "border-border/60 text-foreground/70" },
  manual: { label: "Manual", tone: "border-border/60 text-foreground/70" },
  salt: { label: "Salt", tone: "border-flame/30 text-flame" },
};

function mapMeetingToRow(meeting: MeetingDetailRecord): MeetingTableRow {
  const now = new Date();
  const start = parseISO(meeting.startTime);
  const end = parseISO(meeting.endTime);

  let status: MeetingStatus = "upcoming";
  if (meeting.status === "cancelled") {
    status = "cancelled";
  } else if (meeting.status === "completed" || isBefore(end, now)) {
    status = "past";
  } else if (isBefore(start, now) && isAfter(end, now)) {
    status = "live";
  }

  return {
    id: meeting.id,
    title: meeting.title,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    status,
    locationType: meeting.locationType ?? "custom",
    clientName: (meeting.person?.name ?? meeting.org?.name),
    projectName: meeting.project?.name,
    attendees: meeting.attendees,
    origin: meeting.origin,
  };
}

function formatMeetingTime(startTime: string, endTime: string): string {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  return `${format(start, "MMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
}

function relativeMeetingTime(startTime: string): string {
  const start = parseISO(startTime);
  return formatDistanceToNow(start, { addSuffix: true });
}

const multiFilter: FilterFn<MeetingTableRow> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

type MeetingsDirectoryTableProps = {
  meetings: MeetingDetailRecord[];
};

export function MeetingsDirectoryTable({ meetings }: MeetingsDirectoryTableProps) {
  const router = useRouter();
  const rows = useMemo(() => meetings.map(mapMeetingToRow), [meetings]);

  const columns: ColumnDef<MeetingTableRow>[] = [
    selectionColumn<MeetingTableRow>(),
    {
      accessorKey: "title",
      header: "Meeting",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <Link href={`/meetings/${m.id}`} className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Calendar className="size-3.5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: "startTime",
      header: "When",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="text-sm">
            <p className="tabular-nums text-foreground/90">
              {formatMeetingTime(m.startTime, m.endTime)}
            </p>
            <p className="text-xs text-muted-foreground">{relativeMeetingTime(m.startTime)}</p>
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
        const status = getValue<MeetingStatus>();
        const meta = STATUS_META[status];
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
    {
      id: "attendees",
      header: "Who",
      enableSorting: false,
      cell: ({ row }) => {
        const m = row.original;
        const lead = m.attendees[0];
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <Users className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="truncate text-sm text-foreground/80">
              {lead?.name ?? "—"}
              {m.attendees.length > 1 && (
                <span className="text-muted-foreground"> +{m.attendees.length - 1}</span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "origin",
      header: "Source",
      filterFn: multiFilter,
      cell: ({ getValue }) => {
        const src = getValue<string>() ?? "manual";
        const meta = SOURCE_META[src] ?? SOURCE_META.manual;
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
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
      columnId: "status",
      label: "Status",
      options: [
        { value: "upcoming", label: "Upcoming" },
        { value: "live", label: "Live" },
        { value: "past", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      columnId: "origin",
      label: "Source",
      options: [
        { value: "google-calendar", label: "Google Calendar" },
        { value: "zoom", label: "Zoom" },
        { value: "manual", label: "Manual" },
        { value: "salt", label: "Salt" },
      ],
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search meetings, people, orgs…"
      globalFilterFn={(row, _id, value) => {
        const v = String(value).toLowerCase();
        const m = row.original;
        return (
          m.title.toLowerCase().includes(v) ||
          (m.clientName?.toLowerCase().includes(v) ?? false) ||
          m.attendees.some((p) => p.name.toLowerCase().includes(v)) ||
          m.locationType.toLowerCase().includes(v)
        );
      }}
      onRowClick={(row) => router.push(`/meetings/${row.id}`)}
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
