"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { MemoryWorkRow } from "@/app/_features/work/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
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

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Work"
          description="Every project and engagement in one place — status, progress, and the signals that tell you what needs a nudge."
          action={
            <button
              type="button"
              onClick={() => toast("New work form (coming soon)")}
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              <Plus className="relative z-10 size-4" strokeWidth={2.5} />
              <span className="relative z-10">New work</span>
            </button>
          }
        />

        <WorkDirectoryTable workItems={workItems} />
      </div>
    </div>
  );
}
