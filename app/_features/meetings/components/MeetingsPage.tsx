"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { MeetingsDirectoryTable } from "./MeetingsDirectoryTable";
import { MeetingsStatsStrip } from "./MeetingsStatsStrip";
import { AddMeetingSheet } from "./AddMeetingSheet";
import type { ClientOption } from "../queries";

type MeetingsPageProps = {
  clients: ClientOption[];
};

export function MeetingsPage({ clients }: MeetingsPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Meetings"
          description="Every conversation Salt knows about — briefs before, recaps after, decisions and action items routed back to People, Work, and Plays."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <Plus className="size-4" strokeWidth={2.5} />
                Add meeting
              </button>
              <button
                type="button"
                onClick={() =>
                  toast("Try: 'Get me ready for my next meeting' or 'Save the recap from Atlas kickoff'")
                }
                className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="relative z-10 size-4" strokeWidth={2.5} />
                <span className="relative z-10">Ask Salt</span>
              </button>
            </div>
          }
        />

        <MeetingsStatsStrip />
        <MeetingsDirectoryTable />
      </div>

      <AddMeetingSheet open={sheetOpen} onOpenChange={setSheetOpen} clients={clients} />
    </div>
  );
}
