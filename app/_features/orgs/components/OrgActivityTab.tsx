"use client";

import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import type { OrgActivityEvent } from "@/app/_features/orgs/types";
import { buildOrgActivityAskSaltPrompt } from "@/app/_features/orgs/utils/activity";
import {
  mapActivityEventToTimelineEntry,
  mergeActivityTimeline,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";

type ActivityEntry = ActivityEvent | OrgActivityEvent;

function isProfileActivity(entry: ActivityEntry): entry is OrgActivityEvent {
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

export function OrgActivityTab({
  activity,
  orgName,
  narrative = null,
  lifecycleEvents = [],
  sourceHistory = [],
}: {
  activity: ActivityEntry[];
  orgName: string;
  narrative?: FreshRecordNarrative | null;
  lifecycleEvents?: LifecycleEventDisplay[];
  sourceHistory?: SourceHistoryEntry[];
}) {
  const entries = mergeActivityTimeline({
    activity: activity.map(toTimelineEntry),
    lifecycleEvents,
    sourceHistory,
    narrative,
  });

  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No activity yet"
      emptyDescription="Salt updates, your corrections, and profile fills will show up here as they happen."
      getDiscussPrompt={(entry) => {
        if (entry.field && entry.source && entry.status) {
          return buildOrgActivityAskSaltPrompt(entry as OrgActivityEvent, orgName);
        }
        return `On ${orgName}'s profile: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
      }}
    />
  );
}
