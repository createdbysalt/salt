"use client";

import { forwardRef } from "react";
import { format, parseISO } from "date-fns";
import { MeetingDocumentShell } from "./MeetingDocumentShell";
import type { MeetingDetailRecord, MeetingActionItemRecord } from "../../queries";

type AttendeeWithContext = {
  name: string;
  role: "client" | "team";
  email?: string;
  title?: string;
  company?: string;
  lastInteraction?: string;
  context?: string;
};

type PreviousMeetingContext = {
  id: string;
  title: string;
  date: string;
  summarySnippet?: string;
  openActionItems: MeetingActionItemRecord[];
};

export type MeetingPrepDocumentProps = {
  meeting: MeetingDetailRecord;
  attendeesWithContext?: AttendeeWithContext[];
  previousMeeting?: PreviousMeetingContext | null;
  openActionItems?: MeetingActionItemRecord[];
  className?: string;
};

export const MeetingPrepDocument = forwardRef<HTMLDivElement, MeetingPrepDocumentProps>(
  function MeetingPrepDocument(
    { meeting, attendeesWithContext, previousMeeting, openActionItems = [], className },
    ref,
  ) {
    const startDate = parseISO(meeting.startTime);
    const endDate = parseISO(meeting.endTime);
    const timeRange = `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`;

    const location =
      meeting.locationType === "virtual"
        ? "Virtual"
        : meeting.locationType === "in_person"
          ? "In Person"
          : meeting.meetingUrl
            ? "Virtual"
            : undefined;

    const attendees = attendeesWithContext?.length
      ? attendeesWithContext
      : meeting.attendees.map((a) => ({
          name: a.name,
          role: a.role,
          email: a.email,
        }));

    const clientAttendees = attendees.filter((a) => a.role === "client");
    const teamAttendees = attendees.filter((a) => a.role === "team");

    return (
      <MeetingDocumentShell
        ref={ref}
        title="Meeting Prep Notes"
        meetingTitle={meeting.title}
        meetingDate={startDate}
        meetingTime={timeRange}
        location={location}
        className={className}
      >
        {/* Attendees */}
        {attendees.length > 0 && (
          <section>
            <SectionHeader>Attendees</SectionHeader>
            <div className="space-y-4">
              {clientAttendees.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Client
                  </p>
                  <div className="space-y-3">
                    {clientAttendees.map((attendee, i) => (
                      <AttendeeCard key={i} attendee={attendee} />
                    ))}
                  </div>
                </div>
              )}
              {teamAttendees.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Your Team
                  </p>
                  <div className="space-y-3">
                    {teamAttendees.map((attendee, i) => (
                      <AttendeeCard key={i} attendee={attendee} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Agenda */}
        {meeting.agenda && meeting.agenda.length > 0 && (
          <section>
            <SectionHeader>Agenda</SectionHeader>
            <ol className="space-y-3">
              {meeting.agenda
                .sort((a, b) => a.order - b.order)
                .map((item, i) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        )}

        {/* Previous Meeting Context */}
        {previousMeeting && (
          <section>
            <SectionHeader>Previous Meeting</SectionHeader>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{previousMeeting.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(parseISO(previousMeeting.date), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              {previousMeeting.summarySnippet && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                  {previousMeeting.summarySnippet}
                </p>
              )}
              {previousMeeting.openActionItems.length > 0 && (
                <div className="mt-4 border-t border-border/40 pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Open Action Items
                  </p>
                  <ul className="space-y-1.5">
                    {previousMeeting.openActionItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                        <span className="text-foreground/90">{item.text}</span>
                        {item.assignee && (
                          <span className="shrink-0 text-muted-foreground">— {item.assignee}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Things to Follow Up On */}
        {openActionItems.length > 0 && (
          <section>
            <SectionHeader>Things to Follow Up On</SectionHeader>
            <ul className="space-y-2">
              {openActionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded border border-border/80" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{item.text}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.assignee && <span>{item.assignee}</span>}
                      {item.dueDate && (
                        <span>Due {format(parseISO(item.dueDate), "MMM d")}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quick Reference */}
        {(meeting.person || meeting.org || meeting.project) && (
          <section>
            <SectionHeader>Quick Reference</SectionHeader>
            <div className="flex flex-wrap gap-3">
              {(meeting.person || meeting.org) && (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {meeting.person ? "Person" : "Organization"}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {meeting.person?.name ?? meeting.org?.name}
                  </p>
                </div>
              )}
              {meeting.project && (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Project
                  </p>
                  <p className="text-sm font-medium text-foreground">{meeting.project.name}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notes area for user */}
        <section className="print:break-before-avoid">
          <SectionHeader>Notes</SectionHeader>
          <div className="min-h-[120px] rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground/50">Space for your notes during the meeting...</p>
          </div>
        </section>
      </MeetingDocumentShell>
    );
  },
);

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </h2>
  );
}

function AttendeeCard({ attendee }: { attendee: AttendeeWithContext }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground">
          {attendee.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{attendee.name}</p>
          {(attendee.title || attendee.company) && (
            <p className="text-xs text-muted-foreground">
              {[attendee.title, attendee.company].filter(Boolean).join(" at ")}
            </p>
          )}
          {attendee.context && (
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">{attendee.context}</p>
          )}
          {attendee.lastInteraction && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Last spoke: {attendee.lastInteraction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
