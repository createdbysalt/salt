"use client";

import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { MemoryListAddButton } from "@/app/_features/memory/components/MemoryListAddButton";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { MeetingsDirectoryTable } from "./MeetingsDirectoryTable";
import { MeetingsStatsStrip } from "./MeetingsStatsStrip";
import type { MeetingDetailRecord } from "../queries";

type MeetingsPageProps = {
  meetings: MeetingDetailRecord[];
};

export function MeetingsPage({ meetings }: MeetingsPageProps) {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Meetings"
          description="Every conversation Salt knows about — briefs before, recaps after, decisions and action items routed back to People, Work, and Plays."
          action={<MemoryListAddButton kind="meeting" label="Add meeting" />}
        />

        <MeetingsStatsStrip meetings={meetings} />
        <MeetingsDirectoryTable meetings={meetings} />
      </div>
    </div>
  );
}
