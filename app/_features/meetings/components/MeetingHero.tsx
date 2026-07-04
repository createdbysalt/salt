"use client";

import { format, parseISO, differenceInMinutes } from "date-fns";
import {
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  ListChecks,
  Lightbulb,
  MapPin,
  Phone,
  Sparkles,
  StickyNote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  memoryHeroInnerClass,
  memoryHeroSectionClass,
  memoryHeroTitleClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { MeetingDetailRecord } from "../queries";

export type MeetingQuickAction = "note" | "decision" | "action" | "connection" | "doc";

const LOCATION_LABELS: Record<string, string> = {
  "google-meet": "Google Meet",
  zoom: "Zoom",
  phone: "Phone call",
  "in-person": "In person",
  custom: "Custom link",
};

const LINK_LOCATION_TYPES = new Set(["google-meet", "zoom", "custom"]);

type MeetingHeroProps = {
  meeting: MeetingDetailRecord;
  decisionsCount: number;
  openActionsCount: number;
  notesCount: number;
  connections: Connection[];
  onLink: (connection: Connection) => void;
  onQuickAction: (action: MeetingQuickAction) => void;
};

function formatStartsIn(startDate: Date): string {
  const minutes = differenceInMinutes(startDate, new Date());
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  return `${Math.ceil(minutes / (24 * 60))}d`;
}

export function MeetingHero({
  meeting,
  decisionsCount,
  openActionsCount,
  notesCount,
  connections,
  onLink,
  onQuickAction,
}: MeetingHeroProps) {
  const startDate = parseISO(meeting.startTime);
  const endDate = parseISO(meeting.endTime);
  const durationMinutes = differenceInMinutes(endDate, startDate);
  const isPast = startDate < new Date();
  const isToday = format(startDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const safeMeetingUrl = safeHttpUrl(meeting.meetingUrl);
  const attendeeCount = meeting.attendees.length;

  const stats = [
    { label: "Attendees", value: attendeeCount > 0 ? String(attendeeCount) : "—" },
    { label: "Decisions", value: String(decisionsCount) },
    { label: "Open actions", value: String(openActionsCount) },
    isPast
      ? { label: "Notes", value: notesCount > 0 ? String(notesCount) : "—" }
      : { label: "Starts in", value: formatStartsIn(startDate) },
  ];

  return (
    <section className={memoryHeroSectionClass}>
      <div className={memoryHeroInnerClass}>
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-start">
          <div className="min-w-0 flex-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-5">
              <span className="chip border border-white/20 bg-white/15 text-white/90 backdrop-blur">
                <Calendar className="size-3.5" strokeWidth={2.25} />
                {format(startDate, "EEEE, MMMM d, yyyy")}
              </span>
              {isToday && !isPast && (
                <span className="chip border border-white/20 bg-white/20 text-white backdrop-blur">
                  Today
                </span>
              )}
            </div>
            <h1 className={memoryHeroTitleClass}>{meeting.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" strokeWidth={2} />
                {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")} ({durationMinutes}m)
              </span>
              {meeting.locationType === "in-person" && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" strokeWidth={2} />
                  {LOCATION_LABELS["in-person"]}
                </span>
              )}
              {meeting.locationType === "phone" && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" strokeWidth={2} />
                  {LOCATION_LABELS.phone}
                </span>
              )}
              {meeting.locationType &&
                LINK_LOCATION_TYPES.has(meeting.locationType) &&
                safeMeetingUrl && (
                  <a
                    href={safeMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Link2 className="size-4" strokeWidth={2} />
                    {LOCATION_LABELS[meeting.locationType] ?? meeting.locationType}
                  </a>
                )}
            </div>
            {(meeting.person || meeting.org) && (
              <p className="mt-3 text-sm text-white/70">
                {meeting.person?.name ?? meeting.org?.name}
                {meeting.project && ` · ${meeting.project.name}`}
              </p>
            )}

            <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              openAskSalt({
                context: {
                  type: "meeting",
                  id: meeting.id,
                  title: meeting.title,
                  date: format(startDate, "MMMM d, yyyy"),
                  clientName: (meeting.person?.name ?? meeting.org?.name),
                  projectName: meeting.project?.name,
                  href: `/meetings/${meeting.id}`,
                },
              })
            }
            title="Ask Salt about this meeting"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white pl-4 pr-5 text-sm font-semibold text-neutral-900 transition hover-lift"
          >
            <Sparkles className="size-4 shrink-0 text-flame" strokeWidth={2.25} />
            Ask Salt
          </button>

          <RadixAfterHydration
            fallback={
              <button
                type="button"
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur"
              >
                Quick action
                <ChevronDown className="size-3.5" strokeWidth={2} />
              </button>
            }
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
                >
                  Quick action
                  <ChevronDown className="size-3.5" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => onQuickAction("note")} className="gap-2">
                  <StickyNote className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  Add note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onQuickAction("decision")} className="gap-2">
                  <Lightbulb className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  Add decision
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onQuickAction("action")} className="gap-2">
                  <ListChecks className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  Add action item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <MemoryCreateLinkButton
                  recordKind="meeting"
                  recordId={meeting.id}
                  recordName={meeting.title}
                  existingConnections={connections}
                  onLink={onLink}
                  variant="dropdown"
                />
                <DropdownMenuItem onClick={() => onQuickAction("doc")} className="gap-2">
                  <FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  Link document
                </DropdownMenuItem>
                {safeMeetingUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a
                        href={safeMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <ExternalLink className="size-4 text-muted-foreground" strokeWidth={1.75} />
                        Join meeting
                      </a>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            </RadixAfterHydration>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:w-[200px]">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white/12 backdrop-blur border border-white/20 p-3.5"
                style={{
                  animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`,
                  animationDelay: `${index * 80 + 100}ms`,
                }}
              >
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">
                  {stat.label}
                </p>
                <p className="mt-1 font-display text-2xl leading-none tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -top-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />
    </section>
  );
}
