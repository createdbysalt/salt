"use client";

import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  mergeActivityTimeline,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import {
  buildFileActivityAskSaltPrompt,
  mapFileActivityToTimeline,
} from "@/app/_features/files/utils/activity";
import type { FileActivityEvent } from "../detail-types";

type FileActivityTabProps = {
  activities: FileActivityEvent[];
  supplementalActivity?: ProfileActivityTimelineEntry[];
  fileName: string;
  lifecycleEvents?: LifecycleEventDisplay[];
  sourceHistory?: SourceHistoryEntry[];
  narrative?: FreshRecordNarrative | null;
};

export function FileActivityTab({
  activities,
  supplementalActivity = [],
  fileName,
  lifecycleEvents = [],
  sourceHistory = [],
  narrative = null,
}: FileActivityTabProps) {
  const entries = mergeActivityTimeline({
    activity: [...mapFileActivityToTimeline(activities), ...supplementalActivity],
    lifecycleEvents,
    sourceHistory,
    narrative,
  });

  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No activity yet"
      emptyDescription="Uploads, views, shares, tags, connections, extraction, and lifecycle events show up here as they happen."
      getDiscussPrompt={(entry) => buildFileActivityAskSaltPrompt(entry, fileName)}
    />
  );
}
