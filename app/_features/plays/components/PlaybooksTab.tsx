"use client";

import { PlaybookTabV2 } from "./PlaybookTabV2";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import type { PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";

/**
 * Playbooks Tab — the library of moves Salt runs on your behalf.
 *
 * (Renamed from Customize in the 2026-08-06 reorg; Connectors moved to
 * Sources, Memory Care capabilities surfaced as capability cards in
 * Memory → Rules.)
 *
 * Discovery failures (validation errors, structural skips) are platform-ops
 * signals — they surface in the founder /ops dashboard's Playbook library
 * section, not here. Users can't fix repo YAML.
 */
interface PlaybooksTabProps {
  playbooksV2: PlaybookV2QueryResult | null;
  workspaceId: string;
}

export function PlaybooksTab({
  playbooksV2,
  workspaceId: _workspaceId,
}: PlaybooksTabProps) {
  return (
    <div className="space-y-6">
      <PlaysSectionHeader
        eyebrow="Reusable tactics"
        title="Playbooks"
        description="The library of moves Salt runs on your behalf. Organized by section and tuned to your preferences."
      />

      {playbooksV2 ? (
        <PlaybookTabV2
          playbooks={playbooksV2.playbooks}
          counts={{
            total: playbooksV2.counts.total,
            bySection: playbooksV2.counts.bySection,
          }}
        />
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Loading playbooks...</p>
        </div>
      )}
    </div>
  );
}
