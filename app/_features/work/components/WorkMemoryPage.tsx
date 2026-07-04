"use client";

import type { MemoryWorkRow } from "@/app/_features/work/queries";
import { MemoryListAddButton } from "@/app/_features/memory/components/MemoryListAddButton";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { toDirectoryWorkItem } from "@/app/_features/work/utils/directory-mapper";
import { WorkDirectoryTable } from "./WorkDirectoryTable";

interface WorkMemoryPageProps {
  initialWorkItems?: MemoryWorkRow[];
}

export function WorkMemoryPage({ initialWorkItems = [] }: WorkMemoryPageProps) {
  const workItems = initialWorkItems.map(toDirectoryWorkItem);

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Work"
          description="Every project and engagement in one place — status, progress, and the signals that tell you what needs a nudge."
          action={<MemoryListAddButton kind="work" label="Add work" />}
        />

        <WorkDirectoryTable workItems={workItems} />
      </div>
    </div>
  );
}
