"use client";

import { forwardRef, useMemo } from "react";
import { parseISO } from "date-fns";
import { cn } from "@repo/utils";
import { MeetingDocumentShell } from "./MeetingDocumentShell";
import type { MeetingDetailRecord, MeetingTranscriptRecord } from "../../queries";

export type MeetingTranscriptDocumentProps = {
  meeting: MeetingDetailRecord;
  transcript: MeetingTranscriptRecord | null;
  className?: string;
};

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

const SPEAKER_COLORS = [
  "text-sky",
  "text-success",
  "text-violet",
  "text-flame",
  "text-blush",
];

function getSpeakerColorClass(name: string, speakerIndex: Map<string, number>): string {
  if (!speakerIndex.has(name)) {
    speakerIndex.set(name, speakerIndex.size);
  }
  const index = speakerIndex.get(name)!;
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

export const MeetingTranscriptDocument = forwardRef<HTMLDivElement, MeetingTranscriptDocumentProps>(
  function MeetingTranscriptDocument({ meeting, transcript, className }, ref) {
    const startDate = parseISO(meeting.startTime);

    const speakerIndex = useMemo(() => new Map<string, number>(), []);

    const speakers = useMemo(() => {
      if (!transcript?.segments) return [];
      const speakerMap = new Map<string, number>();
      transcript.segments.forEach((segment) => {
        const name = segment.speaker.name;
        speakerMap.set(name, (speakerMap.get(name) || 0) + 1);
      });
      return Array.from(speakerMap.entries()).sort((a, b) => b[1] - a[1]);
    }, [transcript?.segments]);

    const durationStr = transcript?.durationSeconds
      ? formatDuration(transcript.durationSeconds)
      : undefined;

    if (!transcript) {
      return (
        <MeetingDocumentShell
          ref={ref}
          title="Meeting Transcript"
          meetingTitle={meeting.title}
          meetingDate={startDate}
          className={className}
        >
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No transcript available for this meeting.</p>
          </div>
        </MeetingDocumentShell>
      );
    }

    return (
      <MeetingDocumentShell
        ref={ref}
        title="Meeting Transcript"
        meetingTitle={meeting.title}
        meetingDate={startDate}
        meetingTime={
          [durationStr, speakers.length > 0 && `${speakers.length} speaker${speakers.length !== 1 ? "s" : ""}`]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        className={className}
      >
        {/* Speakers legend */}
        {speakers.length > 1 && (
          <section className="print:break-after-avoid">
            <SectionHeader>Speakers</SectionHeader>
            <div className="flex flex-wrap gap-3">
              {speakers.map(([name]) => (
                <span
                  key={name}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    getSpeakerColorClass(name, speakerIndex),
                  )}
                >
                  <span className="size-2 rounded-full bg-current" />
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Transcript content */}
        <section>
          <SectionHeader>Transcript</SectionHeader>
          {transcript.segments && transcript.segments.length > 0 ? (
            <div className="space-y-4">
              {transcript.segments.map((segment, index) => (
                <div key={index} className="flex gap-4 print:break-inside-avoid">
                  <div className="w-14 shrink-0 pt-0.5 text-right">
                    <span className="font-mono text-xs text-muted-foreground/70">
                      {formatTimestamp(segment.startTime)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        getSpeakerColorClass(segment.speaker.name, speakerIndex),
                      )}
                    >
                      {segment.speaker.name}
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                      {segment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : transcript.content ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {transcript.content}
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {transcript.status === "processing"
                ? "Transcript is being processed..."
                : "No transcript content available."}
            </p>
          )}
        </section>

        {/* Recording link */}
        {transcript.recordingUrl && (
          <section className="print:hidden">
            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                Recording
              </p>
              <a
                href={transcript.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-primary hover:underline"
              >
                View recording
              </a>
            </div>
          </section>
        )}
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
