"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { PeopleDirectoryTable } from "./PeopleDirectoryTable";

export function PeoplePage() {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysSectionHeader
          eyebrow="Memory"
          title="People"
          description="Every relationship in one place, with the context you need to decide who needs a touch and why."
          action={
            <button
              type="button"
              onClick={() => toast("New person form (coming soon)")}
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-transform"
            >
              <Plus className="size-4 relative z-10" strokeWidth={2.5} />
              <span className="relative z-10">New person</span>
            </button>
          }
        />

        <PeopleDirectoryTable />
      </div>
    </div>
  );
}
