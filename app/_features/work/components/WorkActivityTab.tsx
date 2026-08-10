"use client";

import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  mapActivityEventToTimelineEntry,
  mergeActivityTimeline,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import type { WorkActivityEvent } from "@/app/_features/work/types";
import { buildWorkActivityAskSaltPrompt } from "@/app/_features/work/utils/activity";

type ActivityEntry = ActivityEvent | WorkActivityEvent;

function isProfileActivity(entry: ActivityEntry): entry is WorkActivityEvent {
  return "field" in entry && "status" in entry;
}

function toTimelineEntry(entry: ActivityEntry): ProfileActivityTimelineEntry {
  if (isProfileActivity(entry)) {
    return {
      id: entry.id,
      at: entry.at,
      kind: entry.kind,
      label: entry.label,
      detail: entry.detail,
      field: entry.field as ProfileActivityTimelineEntry["field"],
      source: entry.source,
      status: entry.status,
    };
  }

  return mapActivityEventToTimelineEntry(entry);
}

export function WorkActivityTab({
  activity,
  supplementalActivity = [],
  workTitle,
  narrative = null,
  lifecycleEvents = [],
  sourceHistory = [],
}: {
  activity: ActivityEntry[];
  supplementalActivity?: ProfileActivityTimelineEntry[];
  workTitle: string;
  narrative?: FreshRecordNarrative | null;
  lifecycleEvents?: LifecycleEventDisplay[];
  sourceHistory?: SourceHistoryEntry[];
}) {
  const entries = mergeActivityTimeline({
    activity: [...activity.map(toTimelineEntry), ...supplementalActivity],
    lifecycleEvents,
    sourceHistory,
    narrative,
  });

  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No activity yet"
      emptyDescription="Profile updates, health changes, blockers, tags, lifecycle events, and Salt fills show up here as they happen."
      getDiscussPrompt={(entry) => {
        if (entry.field && entry.source && entry.status) {
          return buildWorkActivityAskSaltPrompt(entry as WorkActivityEvent, workTitle);
        }
        return `On ${workTitle}: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
      }}
    />
  );
}
