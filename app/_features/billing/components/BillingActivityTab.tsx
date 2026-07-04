"use client";

import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  buildBillingActivityAskSaltPrompt,
  mapBillingActivityToTimeline,
  mapBillingNotesToActivityEntries,
} from "@/app/_features/billing/utils/activity";
import {
  mergeActivityTimeline,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";

type BillingActivityTabProps = {
  activity: ActivityEvent[];
  partyLabel: string;
  lifecycleEvents?: LifecycleEventDisplay[];
  supplementalActivity?: ProfileActivityTimelineEntry[];
  sourceHistory?: SourceHistoryEntry[];
  notes?: EntityNoteWithProvenance[];
};

export function BillingActivityTab({
  activity,
  partyLabel,
  lifecycleEvents = [],
  supplementalActivity = [],
  sourceHistory = [],
  notes = [],
}: BillingActivityTabProps) {
  const entries = mergeActivityTimeline({
    activity: [
      ...mapBillingActivityToTimeline(activity),
      ...supplementalActivity,
      ...mapBillingNotesToActivityEntries(notes),
    ],
    lifecycleEvents,
    sourceHistory,
  });

  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No activity yet"
      emptyDescription="Payments, tags, connections, notes, status changes, and keeper suggestions will show up here as they happen."
      getDiscussPrompt={(entry) => buildBillingActivityAskSaltPrompt(entry, partyLabel)}
    />
  );
}
