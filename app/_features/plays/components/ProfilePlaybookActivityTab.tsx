"use client";

import type { ProfileProvenanceFeedItem } from "@/app/_features/plays/playbooks/records-engine/types";
import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import {
  buildPlaybookProvenanceAskSaltPrompt,
  mapProvenanceFeedItemToTimelineEntry,
} from "@/app/_features/people/utils/activity";

type ProfilePlaybookActivityTabProps = {
  playbookTitle: string;
  recentProvenance: ProfileProvenanceFeedItem[];
};

export function ProfilePlaybookActivityTab({
  playbookTitle,
  recentProvenance,
}: ProfilePlaybookActivityTabProps) {
  const entries = recentProvenance.map(mapProvenanceFeedItemToTimelineEntry);

  return (
    <ProfileActivityTimeline
      entries={entries}
      emptyTitle="No playbook activity yet"
      emptyDescription="Profile fills appear here after capture or Ask Salt creates or enriches people."
      getDiscussPrompt={(entry) => buildPlaybookProvenanceAskSaltPrompt(entry, playbookTitle)}
    />
  );
}
