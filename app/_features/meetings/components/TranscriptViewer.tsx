"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Badge } from "@/app/_components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/_components/ui/tabs";
import { Button } from "@/app/_components/ui/button";
import {
  Search,
  X,
  FileText,
  Clock,
  ChevronUp,
  ChevronDown,
  Users,
} from "lucide-react";
import { cn } from "@repo/utils";
import { MeetingSummaryDisplay } from "./MeetingSummaryDisplay";
import { ActionItemsList } from "./ActionItemsList";
import type { TranscriptViewerProps, TranscriptSegment } from "../types";

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

/**
 * Get unique speaker color based on name hash
 */
function getSpeakerColor(name: string): string {
  const colors = [
    "text-blue-600 dark:text-blue-400",
    "text-green-600 dark:text-green-400",
    "text-purple-600 dark:text-purple-400",
    "text-orange-600 dark:text-orange-400",
    "text-pink-600 dark:text-pink-400",
    "text-teal-600 dark:text-teal-400",
  ];

  // Simple hash based on string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Highlight search matches in text
 */
function highlightMatches(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery.trim()) {
    return text;
  }

  const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={index}
        className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Escape special regex characters in search string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * TranscriptViewer - Displays meeting transcripts with AI summary
 *
 * Main component for viewing meeting transcripts, AI-generated summaries,
 * and extracted action items. Includes search functionality.
 *
 * @example
 * ```tsx
 * <TranscriptViewer
 *   transcript={transcript}
 *   summary={summary}
 *   actionItems={items}
 * />
 * ```
 */
export function TranscriptViewer({
  transcript,
  summary,
  actionItems,
  className,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Filter segments that match search query
  const { filteredSegments, matchCount } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredSegments: transcript.segments, matchCount: 0 };
    }

    const query = searchQuery.toLowerCase();
    const matching = transcript.segments.filter((segment) =>
      segment.text.toLowerCase().includes(query)
    );

    return {
      filteredSegments: matching.length > 0 ? matching : transcript.segments,
      matchCount: matching.length,
    };
  }, [transcript.segments, searchQuery]);

  // Get unique speakers
  const speakers = useMemo(() => {
    const speakerSet = new Map<string, number>();
    transcript.segments.forEach((segment) => {
      const name = segment.speaker.name;
      speakerSet.set(name, (speakerSet.get(name) || 0) + 1);
    });
    return Array.from(speakerSet.entries()).sort((a, b) => b[1] - a[1]);
  }, [transcript.segments]);

  // Navigate between search matches
  const navigateMatch = useCallback(
    (direction: "prev" | "next") => {
      if (matchCount === 0) return;
      setCurrentMatchIndex((prev) => {
        if (direction === "next") {
          return prev >= matchCount - 1 ? 0 : prev + 1;
        }
        return prev <= 0 ? matchCount - 1 : prev - 1;
      });
    },
    [matchCount]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setCurrentMatchIndex(0);
  }, []);

  // Resolve action items (from props or summary)
  const resolvedActionItems = actionItems || summary?.actionItems || [];

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header with stats */}
      <div className="flex flex-wrap items-center gap-4">
        <Badge variant="outline" className="gap-1.5">
          <Clock className="h-3 w-3" />
          {formatDuration(transcript.durationSeconds)}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3 w-3" />
          {speakers.length} {speakers.length === 1 ? "speaker" : "speakers"}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <FileText className="h-3 w-3" />
          {transcript.segments.length} segments
        </Badge>
      </div>

      {/* Tabs for Summary, Action Items, and Transcript */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="actions">
            Action Items
            {resolvedActionItems.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {resolvedActionItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          {summary ? (
            <MeetingSummaryDisplay summary={summary} />
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="mb-3 h-12 w-12 opacity-50" />
                  <p className="text-sm">No AI summary available</p>
                  <p className="mt-1 text-xs">
                    Summary will be generated when transcription is processed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="mt-4">
          <ActionItemsList actionItems={resolvedActionItems} />
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Full Transcript
                </CardTitle>

                {/* Search input */}
                <div className="relative flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentMatchIndex(0);
                      }}
                      className="w-64 pl-9 pr-9"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Match navigation */}
                  {searchQuery && matchCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {currentMatchIndex + 1}/{matchCount}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigateMatch("prev")}
                        aria-label="Previous match"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigateMatch("next")}
                        aria-label="Next match"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* No matches indicator */}
                  {searchQuery && matchCount === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No matches
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Speakers legend */}
              {speakers.length > 1 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 border-b pb-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    Speakers:
                  </span>
                  {speakers.map(([name, count]) => (
                    <span
                      key={name}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        getSpeakerColor(name)
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {name}
                      <span className="text-muted-foreground">({count})</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Transcript segments */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredSegments.map((segment, index) => (
                  <TranscriptSegmentView
                    key={`${segment.startTime}-${index}`}
                    segment={segment}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Single transcript segment view
 */
function TranscriptSegmentView({
  segment,
  searchQuery,
}: {
  segment: TranscriptSegment;
  searchQuery: string;
}) {
  const speakerColor = getSpeakerColor(segment.speaker.name);

  return (
    <div className="group flex gap-3">
      {/* Timestamp */}
      <div className="flex w-16 shrink-0 flex-col items-end pt-0.5">
        <span className="font-mono text-xs text-muted-foreground">
          {formatTimestamp(segment.startTime)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Speaker name */}
        <span className={cn("text-sm font-medium", speakerColor)}>
          {segment.speaker.name}
        </span>

        {/* Text with search highlighting */}
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">
          {highlightMatches(segment.text, searchQuery)}
        </p>
      </div>
    </div>
  );
}
