"use client";

import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  buildBillingActivityAskSaltPrompt,
  mapBillingActivityToTimeline,
} from "@/app/_features/billing/utils/activity";
import type { BillingDetailViewModel } from "../detail-types";

type BillingActivityTabProps = {
  billing: BillingDetailViewModel;
};

export function BillingActivityTab({ billing }: BillingActivityTabProps) {
  const entries = mapBillingActivityToTimeline(billing.activity);

  return (
    <ProfileActivityTimeline
      entries={entries}
      helperText="A running log of what changed on this billing record. Edit or undo opens Ask Salt. Anything that needs you is in Plays → Queue."
      emptyTitle="No activity yet"
      emptyDescription="Status changes, capture matches, and keeper suggestions will show up here as they happen."
      getDiscussPrompt={(entry) => buildBillingActivityAskSaltPrompt(entry, billing.partyLabel)}
    />
  );
}
