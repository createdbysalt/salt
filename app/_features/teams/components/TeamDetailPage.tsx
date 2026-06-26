"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { memoryDetailShellClass } from "@/app/_features/memory/utils/memory-layout";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

export function TeamDetailPage({ teamId }: { teamId: string }) {
  void teamId;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
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
