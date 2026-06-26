"use client";

import { ProfileActivityTimeline } from "@/app/_features/memory/components/ProfileActivityTimeline";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import { SectionCard } from "../MeSection";

export function MeActivityTab({ entries }: { entries: ProfileActivityTimelineEntry[] }) {
  return (
    <SectionCard eyebrow="Activity" title="Your recent moves across Salt">
      <ProfileActivityTimeline
        entries={entries}
        emptyTitle="No activity yet"
        emptyDescription="Memories Salt learns and goals you set will show up here."
        getDiscussPrompt={(entry) =>
          `Tell me more about this memory event: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}.`
        }
      />
    </SectionCard>
  );
}
