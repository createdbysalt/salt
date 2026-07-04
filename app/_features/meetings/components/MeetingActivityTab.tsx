"use client";

import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import { mergeActivityTimeline } from "@/app/_features/people/utils/activity";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import {
  buildMeetingActivityAskSaltPrompt,
  type MeetingActivityEvent,
} from "../utils/activity";

type MeetingActivityTabProps = {
  activity: MeetingActivityEvent[];
  supplementalActivity?: (ProfileActivityTimelineEntry | MeetingActivityEvent)[];
  meetingTitle: string;
  lifecycleEvents?: LifecycleEventDisplay[];
  sourceHistory?: SourceHistoryEntry[];
};

export function MeetingActivityTab({
  activity,
  supplementalActivity = [],
  meetingTitle,
  lifecycleEvents = [],
  sourceHistory = [],
}: MeetingActivityTabProps) {
  const entries = mergeActivityTimeline({
    activity: [...activity, ...supplementalActivity] as ProfileActivityTimelineEntry[],
    lifecycleEvents,
    sourceHistory,
    narrative: null,
  });

  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No activity yet"
      emptyDescription="Decisions, action items, notes, connections, and updates show up here as they happen."
      getDiscussPrompt={(entry) => {
        if (entry.field && entry.source && entry.status) {
          return buildMeetingActivityAskSaltPrompt(
            entry as MeetingActivityEvent,
            meetingTitle,
          );
        }
        return `On meeting "${meetingTitle}": "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
      }}
    />
  );
}
