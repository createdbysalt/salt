"use client";

import type { Person } from "@/app/_lib/demo/people-demo-data";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  buildPersonActivityAskSaltPrompt,
  withNarrativeActivityEntry,
  type PersonActivityEvent,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";

type ActivityEntry = Person["activity"][number] | PersonActivityEvent;

function isProfileActivity(entry: ActivityEntry): entry is PersonActivityEvent {
  return "field" in entry && "status" in entry;
}

function toTimelineEntry(entry: ActivityEntry): ProfileActivityTimelineEntry {
  if (isProfileActivity(entry)) {
    return entry;
  }

  return {
    id: entry.id,
    at: entry.at,
    kind: entry.kind in { ai: 1, keeper: 1, salt: 1, user: 1, system: 1 } ? entry.kind : "keeper",
    label: entry.label,
    detail: entry.detail ?? null,
  };
}

export function PersonActivityTab({
  activity,
  personName,
  narrative = null,
}: {
  activity: ActivityEntry[];
  personName: string;
  narrative?: FreshRecordNarrative | null;
}) {
  const entries = withNarrativeActivityEntry(activity.map(toTimelineEntry), narrative);

  return (
    <ProfileActivityTimeline
      entries={entries}
      helperText="A running log of what changed on this record. Edit or undo opens Ask Salt. Anything that needs you is in Plays → Queue."
      emptyTitle="No activity yet"
      emptyDescription="Keeper updates, your corrections, and profile fills will show up here as they happen."
      getDiscussPrompt={(entry) => {
        if (entry.field && entry.source && entry.status) {
          return buildPersonActivityAskSaltPrompt(
            entry as PersonActivityEvent,
            personName,
          );
        }
        return `On ${personName}'s profile: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
      }}
    />
  );
}
