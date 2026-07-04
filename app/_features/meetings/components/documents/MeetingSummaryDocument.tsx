"use client";

import { forwardRef } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { cn } from "@repo/utils";
import { MeetingDocumentShell } from "./MeetingDocumentShell";
import type {
  MeetingDetailRecord,
  MeetingSummaryRecord,
  MeetingDecisionRecord,
  MeetingActionItemRecord,
} from "../../queries";

export type MeetingSummaryDocumentProps = {
  meeting: MeetingDetailRecord;
  summary: MeetingSummaryRecord | null;
  decisions: MeetingDecisionRecord[];
  actionItems: MeetingActionItemRecord[];
  className?: string;
};

export const MeetingSummaryDocument = forwardRef<HTMLDivElement, MeetingSummaryDocumentProps>(
  function MeetingSummaryDocument(
    { meeting, summary, decisions, actionItems, className },
    ref,
  ) {
    const startDate = parseISO(meeting.startTime);
    const endDate = parseISO(meeting.endTime);
    const durationMinutes = differenceInMinutes(endDate, startDate);
    const durationStr =
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        : `${durationMinutes} min`;

    const attendeeCount = meeting.attendees.length;

    return (
      <MeetingDocumentShell
        ref={ref}
        title="Meeting Summary"
        meetingTitle={meeting.title}
        meetingDate={startDate}
        meetingTime={`${durationStr} · ${attendeeCount} attendee${attendeeCount !== 1 ? "s" : ""}`}
        className={className}
      >
        {/* Executive Summary */}
        {summary?.content && (
          <section>
            <SectionHeader>Executive Summary</SectionHeader>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {summary.content}
              </p>
            </div>
          </section>
        )}

        {/* Key Decisions */}
        {decisions.length > 0 && (
          <section>
            <SectionHeader>Key Decisions</SectionHeader>
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  className="border-l-2 border-success/40 pl-4"
                >
                  <p className="text-sm font-medium text-foreground">{decision.text}</p>
                  {decision.rationale && (
                    <p className="mt-1 text-sm text-muted-foreground">{decision.rationale}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <section>
            <SectionHeader>Action Items</SectionHeader>
            <div className="space-y-2">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-border/60 p-3",
                    item.completed && "bg-muted/30 opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                      item.completed
                        ? "border-success/60 bg-success/10 text-success"
                        : "border-border/80",
                    )}
                  >
                    {item.completed && (
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm text-foreground",
                        item.completed && "line-through",
                      )}
                    >
                      {item.text}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.assignee && (
                        <span className="rounded-full bg-muted px-2 py-0.5">{item.assignee}</span>
                      )}
                      {item.dueDate && (
                        <span>Due {format(parseISO(item.dueDate), "MMM d, yyyy")}</span>
                      )}
                      {item.priority && item.priority !== "medium" && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                            item.priority === "high" && "bg-destructive/10 text-destructive",
                            item.priority === "low" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.priority}
                        </span>
                      )}
                    </div>
                    {item.context && (
                      <p className="mt-1.5 text-xs text-muted-foreground/80">{item.context}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Attendees */}
        {meeting.attendees.length > 0 && (
          <section>
            <SectionHeader>Attendees</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {meeting.attendees.map((attendee, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    attendee.role === "client"
                      ? "border-sky/30 bg-sky/5 text-foreground"
                      : "border-border/60 bg-muted/30 text-muted-foreground",
                  )}
                >
                  {attendee.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Meeting Notes */}
        {meeting.notes && (
          <section>
            <SectionHeader>Additional Notes</SectionHeader>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {meeting.notes}
            </p>
          </section>
        )}

        {/* Stats footer */}
        <section className="print:break-before-avoid">
          <div className="flex flex-wrap gap-4 rounded-xl bg-muted/30 p-4">
            <Stat label="Duration" value={durationStr} />
            <Stat label="Attendees" value={String(attendeeCount)} />
            <Stat label="Decisions" value={String(decisions.length)} />
            <Stat
              label="Action Items"
              value={`${actionItems.filter((i) => !i.completed).length} open`}
            />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
