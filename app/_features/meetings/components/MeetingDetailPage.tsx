"use client";

import Link from "next/link";
import { useState } from "react";
import { format, formatDistanceToNow, parseISO, differenceInMinutes } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Link2,
  MapPin,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@repo/utils";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import {
  memoryDetailGridClass,
  memoryDetailShellClass,
  memoryHeroInnerClass,
  memoryHeroSectionClass,
  memoryHeroTitleClass,
  memoryTabPanelClass,
  memoryTabsListEqualClass,
  memoryTabTriggerEqualClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { MeetingDetailData } from "../queries";
import { MeetingSummaryTab } from "./MeetingSummaryTab";
import { MeetingDecisionsList } from "./MeetingDecisionsList";
import { MeetingActionItemsTab } from "./MeetingActionItemsTab";
import { MeetingTranscriptTab } from "./MeetingTranscriptTab";
import { ConnectedFilesSection } from "./ConnectedFilesSection";

type MeetingDetailPageProps = {
  meetingId: string;
  detailData: MeetingDetailData;
};

const MEETING_DETAIL_TABS = [
  { value: "summary", label: "Summary" },
  { value: "decisions", label: "Decisions" },
  { value: "actions", label: "Action Items" },
  { value: "transcript", label: "Transcript" },
] as const;

type MeetingDetailTab = (typeof MEETING_DETAIL_TABS)[number]["value"];

const LOCATION_LABELS: Record<string, string> = {
  "google-meet": "Google Meet",
  zoom: "Zoom",
  phone: "Phone call",
  "in-person": "In person",
  custom: "Custom link",
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-sky/10 text-sky border-sky/30",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  "no-show": "bg-warning/10 text-warning border-warning/30",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

export function MeetingDetailPage({ meetingId: _meetingId, detailData }: MeetingDetailPageProps) {
  const [tab, setTab] = useState<MeetingDetailTab>("summary");
  const meeting = detailData.meeting;

  if (!meeting) {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className={memoryDetailShellClass}>
          <BackToMeetingsLink />
          <MockContentEmptyState
            title="Meeting not found"
            description="This meeting is not in your Meeting Memory yet."
          />
        </div>
      </div>
    );
  }

  const startDate = parseISO(meeting.startTime);
  const endDate = parseISO(meeting.endTime);
  const durationMinutes = differenceInMinutes(endDate, startDate);
  const isPast = startDate < new Date();
  const isToday = format(startDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const currentSummary = detailData.summaries.find((s) => s.isCurrent) ?? detailData.summaries[0];

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <BackToMeetingsLink />

        {/* Hero */}
        <div className={memoryHeroSectionClass}>
          <div className={memoryHeroInnerClass}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  <Calendar className="size-3.5" strokeWidth={2.25} />
                  {format(startDate, "EEEE, MMMM d, yyyy")}
                </div>
                <h1 className={cn(memoryHeroTitleClass, "mt-3")}>{meeting.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/85">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4" strokeWidth={2} />
                    {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")} ({durationMinutes}m)
                  </span>
                  {meeting.locationType && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" strokeWidth={2} />
                      {LOCATION_LABELS[meeting.locationType] ?? meeting.locationType}
                    </span>
                  )}
                </div>
                {meeting.client && (
                  <p className="mt-3 text-sm text-white/70">
                    {meeting.client.name}
                    {meeting.project && ` · ${meeting.project.name}`}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    STATUS_STYLES[meeting.status] ?? STATUS_STYLES.scheduled,
                  )}
                >
                  {STATUS_LABELS[meeting.status] ?? meeting.status}
                </span>
                {isToday && !isPast && (
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                    Today
                  </span>
                )}
                {isPast && (
                  <span className="text-xs text-white/60">
                    {formatDistanceToNow(startDate, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>

            {meeting.meetingUrl && (
              <a
                href={meeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
              >
                <ExternalLink className="size-3.5" strokeWidth={2.25} />
                Join meeting
              </a>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className={memoryDetailGridClass}>
          <div className="min-w-0 space-y-6">
            <div className="space-y-5">
              {/* Tabs */}
              <div
                className={cn(memoryTabsListEqualClass, "grid-cols-4")}
                role="tablist"
                aria-label="Meeting detail tabs"
              >
                {MEETING_DETAIL_TABS.map((item) => {
                  const active = tab === item.value;
                  let badgeCount: number | undefined;
                  if (item.value === "decisions") badgeCount = detailData.decisions.length;
                  if (item.value === "actions") badgeCount = detailData.actionItems.length;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      id={`meeting-detail-${item.value}-trigger`}
                      aria-selected={active}
                      aria-controls={`meeting-detail-${item.value}-panel`}
                      className={cn(
                        memoryTabTriggerEqualClass,
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      data-state={active ? "active" : "inactive"}
                      onClick={() => setTab(item.value)}
                    >
                      {item.label}
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-current/10 px-1.5 text-[10px]">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab panels */}
              <div className={memoryTabPanelClass}>
                <div
                  role="tabpanel"
                  id="meeting-detail-summary-panel"
                  aria-labelledby="meeting-detail-summary-trigger"
                  hidden={tab !== "summary"}
                  className="m-0"
                >
                  <MeetingSummaryTab
                    meetingId={meeting.id}
                    summary={currentSummary}
                    description={meeting.description}
                    notes={meeting.notes}
                  />
                </div>
                <div
                  role="tabpanel"
                  id="meeting-detail-decisions-panel"
                  aria-labelledby="meeting-detail-decisions-trigger"
                  hidden={tab !== "decisions"}
                  className="m-0"
                >
                  <MeetingDecisionsList meetingId={meeting.id} decisions={detailData.decisions} />
                </div>
                <div
                  role="tabpanel"
                  id="meeting-detail-actions-panel"
                  aria-labelledby="meeting-detail-actions-trigger"
                  hidden={tab !== "actions"}
                  className="m-0"
                >
                  <MeetingActionItemsTab
                    meetingId={meeting.id}
                    actionItems={detailData.actionItems}
                  />
                </div>
                <div
                  role="tabpanel"
                  id="meeting-detail-transcript-panel"
                  aria-labelledby="meeting-detail-transcript-trigger"
                  hidden={tab !== "transcript"}
                  className="m-0"
                >
                  <MeetingTranscriptTab meetingId={meeting.id} transcript={detailData.transcript} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <MeetingDetailSidebar meeting={meeting} sources={detailData.sources} />
        </div>
      </div>
    </div>
  );
}

function BackToMeetingsLink() {
  return (
    <Link
      href="/meetings"
      className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Back to Meetings
    </Link>
  );
}

type MeetingDetailSidebarProps = {
  meeting: NonNullable<MeetingDetailData["meeting"]>;
  sources: MeetingDetailData["sources"];
};

function MeetingDetailSidebar({ meeting, sources }: MeetingDetailSidebarProps) {
  const ingestionSources = sources.filter((s) => s.kind !== "linked_file");

  return (
    <div className="space-y-4">
      {/* Attendees */}
      {meeting.attendees.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="size-4" strokeWidth={2} />
            Attendees
          </h3>
          <ul className="space-y-2">
            {meeting.attendees.map((attendee, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                  {attendee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{attendee.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{attendee.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Client/Project links */}
      {(meeting.client || meeting.project) && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="size-4" strokeWidth={2} />
            Connections
          </h3>
          <ul className="space-y-2">
            {meeting.client && (
              <li>
                <Link
                  href={`/people/${meeting.clientId}`}
                  className="block rounded-xl border border-border/60 px-3 py-2 text-sm transition hover:bg-muted/50"
                >
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Client
                  </span>
                  <span className="mt-0.5 block font-medium text-foreground">
                    {meeting.client.name}
                  </span>
                </Link>
              </li>
            )}
            {meeting.project && meeting.projectId && (
              <li>
                <Link
                  href={`/work/${meeting.projectId}`}
                  className="block rounded-xl border border-border/60 px-3 py-2 text-sm transition hover:bg-muted/50"
                >
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Project
                  </span>
                  <span className="mt-0.5 block font-medium text-foreground">
                    {meeting.project.name}
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Connected Files */}
      <ConnectedFilesSection meetingId={meeting.id} sources={sources} />

      {/* Ingestion Sources (calendar, recording, transcript - not linked files) */}
      {ingestionSources.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Play className="size-4" strokeWidth={2} />
            Sources
          </h3>
          <ul className="space-y-2">
            {ingestionSources.map((source) => (
              <li key={source.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-xs capitalize">
                    {source.provider.replace(/-/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">{source.kind.replace(/_/g, " ")}</span>
                </div>
                {(() => {
                  const safeUrl = safeHttpUrl(source.sourceUrl);
                  return safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      View source
                    </a>
                  ) : null;
                })()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ask Salt CTA */}
      <button
        type="button"
        className="surface-aurora relative w-full rounded-2xl px-4 py-3 text-left text-white transition hover:-translate-y-0.5"
      >
        <div className="relative z-10 flex items-center gap-2">
          <Sparkles className="size-4" strokeWidth={2.5} />
          <span className="text-sm font-medium">Ask Salt about this meeting</span>
        </div>
      </button>
    </div>
  );
}
