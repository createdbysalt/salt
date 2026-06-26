import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import {
  buildGenericRecordActivityAskSaltPrompt,
  mapActivityEventToTimelineEntry,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";

export function mapBillingActivityToTimeline(
  activity: ActivityEvent[],
): ProfileActivityTimelineEntry[] {
  return activity.map(mapActivityEventToTimelineEntry);
}

export function buildBillingActivityAskSaltPrompt(
  entry: ProfileActivityTimelineEntry,
  partyLabel: string,
): string {
  return buildGenericRecordActivityAskSaltPrompt(`billing for ${partyLabel}`, entry);
}
