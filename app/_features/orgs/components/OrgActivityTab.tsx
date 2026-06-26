"use client";

import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import type { OrgActivityEvent } from "@/app/_features/orgs/types";
import { buildOrgActivityAskSaltPrompt } from "@/app/_features/orgs/utils/activity";
import {
  mapActivityEventToTimelineEntry,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";

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
}: {
  activity: ActivityEntry[];
  orgName: string;
}) {
  const entries = activity.map(toTimelineEntry);

  return (
    <ProfileActivityTimeline
      entries={entries}
      helperText="A running log of what changed on this organization. Edit or undo opens Ask Salt. Anything that needs you is in Plays → Queue."
      emptyTitle="No activity yet"
      emptyDescription="Keeper updates, your corrections, and profile fills will show up here as they happen."
      getDiscussPrompt={(entry) => {
        if (entry.field && entry.source && entry.status) {
          return buildOrgActivityAskSaltPrompt(entry as OrgActivityEvent, orgName);
        }
        return `On ${orgName}'s profile: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
      }}
    />
  );
}
