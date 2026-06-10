"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

export function TeamDetailPage({ teamId }: { teamId: string }) {
  void teamId;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10 px-4 md:px-8">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Teams
        </Link>

        <MockContentEmptyState
          title="Team not found"
          description="Teams will appear here once you organize people and work in Salt."
        />
      </div>
    </div>
  );
}
