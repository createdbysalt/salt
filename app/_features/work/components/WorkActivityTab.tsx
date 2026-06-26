"use client";

import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  mapActivityEventToTimelineEntry,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
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
  workTitle,
}: {
  activity: ActivityEntry[];
  workTitle: string;
}) {
  const entries = activity.map(toTimelineEntry);

  return (
    <ProfileActivityTimeline
      entries={entries}
      helperText="A running log of what changed on this work record. Edit or undo opens Ask Salt. Anything that needs you is in Plays → Queue."
      emptyTitle="No activity yet"
      emptyDescription="Keeper updates, status changes, linked context, and profile fills will show up here as they happen."
      getDiscussPrompt={(entry) => {
        if (entry.field && entry.source && entry.status) {
          return buildWorkActivityAskSaltPrompt(entry as WorkActivityEvent, workTitle);
        }
        return `On ${workTitle}: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
      }}
    />
  );
}
