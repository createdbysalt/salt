"use client";

import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { TeamsStatsStrip } from "./TeamsStatsStrip";
import { TeamsMemoryDirectoryTable } from "./TeamsMemoryDirectoryTable";

export function TeamsMemoryPage() {
  return (
    <div className="relative min-h-full">
      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Teams"
          description="The people who work inside your Salt workspace — operators, counsel, finance, and anyone you invite to share the load."
          action={
            <button
              type="button"
              onClick={() => toast("Invite teammate flow (coming soon)")}
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              <UserPlus className="relative z-10 size-4" strokeWidth={2.5} />
              <span className="relative z-10">Invite teammate</span>
            </button>
          }
        />

        <TeamsStatsStrip />
        <TeamsMemoryDirectoryTable />
      </div>
    </div>
  );
}
