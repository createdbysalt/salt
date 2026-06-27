"use client";

import { useState, useMemo } from "react";
import { Clock, FileText, Search, Users, X } from "lucide-react";
import { cn } from "@repo/utils";
import type { MeetingTranscriptRecord } from "../queries";

type MeetingTranscriptTabProps = {
  meetingId: string;
  transcript: MeetingTranscriptRecord | null;
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

function getSpeakerColor(name: string): string {
  const colors = [
    "text-sky",
    "text-success",
    "text-violet",
    "text-flame",
    "text-blush",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="rounded bg-warning/30 px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function MeetingTranscriptTab({ meetingId: _meetingId, transcript }: MeetingTranscriptTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const speakers = useMemo(() => {
    if (!transcript?.segments) return [];
    const speakerMap = new Map<string, number>();
    transcript.segments.forEach((segment) => {
      const name = segment.speaker.name;
      speakerMap.set(name, (speakerMap.get(name) || 0) + 1);
    });
    return Array.from(speakerMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [transcript?.segments]);

  const filteredSegments = useMemo(() => {
    if (!transcript?.segments) return [];
    if (!searchQuery.trim()) return transcript.segments;

    const query = searchQuery.toLowerCase();
    return transcript.segments.filter((segment) =>
      segment.text.toLowerCase().includes(query),
    );
  }, [transcript?.segments, searchQuery]);

  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-4 size-12 text-muted-foreground/40" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-foreground">No transcript</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Upload a transcript or connect a recording service like Fireflies or Recall.
        </p>
      </div>
    );
  }

  if (!transcript.segments?.length && !transcript.content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-4 size-12 text-muted-foreground/40" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-foreground">Transcript processing</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {transcript.status === "processing"
            ? "Your transcript is being processed. Check back soon."
            : "No transcript content available."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        {transcript.durationSeconds && (
          <span className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs">
            <Clock className="size-3" />
            {formatDuration(transcript.durationSeconds)}
          </span>
        )}
        {speakers.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs">
            <Users className="size-3" />
            {speakers.length} {speakers.length === 1 ? "speaker" : "speakers"}
          </span>
        )}
        {transcript.segments && (
          <span className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs">
            <FileText className="size-3" />
            {transcript.segments.length} segments
          </span>
        )}
      </div>

      {/* Search */}
      {transcript.segments && transcript.segments.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full rounded-lg border border-border/60 bg-background py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Speakers legend */}
      {speakers.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
          <span className="text-xs font-medium text-muted-foreground">Speakers:</span>
          {speakers.map(([name, count]) => (
            <span
              key={name}
              className={cn("flex items-center gap-1.5 text-xs", getSpeakerColor(name))}
            >
              <span className="size-2 rounded-full bg-current" />
              {name}
              <span className="text-muted-foreground">({count})</span>
            </span>
          ))}
        </div>
      )}

      {/* Transcript content */}
      {transcript.segments && transcript.segments.length > 0 ? (
        <div className="max-h-[500px] space-y-4 overflow-y-auto pr-2">
          {filteredSegments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matches found for &ldquo;{searchQuery}&rdquo;
            </p>
          ) : (
            filteredSegments.map((segment, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-14 shrink-0 pt-0.5 text-right">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(segment.startTime)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn("text-sm font-medium", getSpeakerColor(segment.speaker.name))}>
                    {segment.speaker.name}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                    {highlightMatches(segment.text, searchQuery)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : transcript.content ? (
        <div className="max-h-[500px] overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {transcript.content}
          </p>
        </div>
      ) : null}

      {/* Recording link */}
      {transcript.recordingUrl && (
        <div className="border-t border-border/60 pt-4">
          <a
            href={transcript.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            View recording
          </a>
        </div>
      )}
    </div>
  );
}
