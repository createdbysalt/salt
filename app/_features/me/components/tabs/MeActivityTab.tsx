"use client";

import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";

/** Per-family Ask-Salt discuss prompts, keyed off the entry id prefix. */
function discussPrompt(entry: ProfileActivityTimelineEntry): string {
  const suffix = `"${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}`;
  if (entry.id.startsWith("fact-")) {
    return `Tell me more about this memory event on my Me record: ${suffix}.`;
  }
  if (entry.id.startsWith("goal-")) {
    return `Tell me more about this goal event: ${suffix}.`;
  }
  if (entry.id.startsWith("me-profile-")) {
    return `Tell me more about this profile field change on my Me record: ${suffix}.`;
  }
  if (entry.id.startsWith("voice-")) {
    return `Tell me more about this voice profile event: ${suffix}.`;
  }
  if (entry.id.startsWith("icp-")) {
    return `Tell me more about this ICP segment event: ${suffix}.`;
  }
  if (entry.id.startsWith("service-")) {
    return `Tell me more about this service event: ${suffix}.`;
  }
  if (entry.id.startsWith("me-note-")) {
    return `Tell me more about this note on my Me record: ${suffix}.`;
  }
  return `Tell me more about this event on my Me record: ${suffix}.`;
}

function undoPrompt(entry: ProfileActivityTimelineEntry): string {
  return `On my Me record, undo or revert this change: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}.`;
}

export function MeActivityTab({ entries }: { entries: ProfileActivityTimelineEntry[] }) {
  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No activity yet"
      emptyDescription="Memories Salt learns, goals, profile and business updates, voice changes, ICP segments, services, and notes will show up here."
      getDiscussPrompt={discussPrompt}
      getUndoPrompt={undoPrompt}
    />
  );
}
