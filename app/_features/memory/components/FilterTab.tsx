"use client";

import { useState } from "react";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import {
  FilterStatusPill,
  type FilterStatus,
} from "./FilterStatusPill";
import { WatchingSection } from "./WatchingSection";
import { HandledSection } from "./HandledSection";
import type { GroupedLearningEvidence } from "../queries/learning-evidence";
import type { AdmissionDecisions } from "../queries/admission-decisions";
import type { HandledWrite } from "../queries/handled-items";

/**
 * Memory → Filter — the transparency surface.
 *
 * One pill, two views (P11: Kept out moved to Sources → Activity):
 * - Watching: what Salt is still gathering confidence on (nudges teach the bar).
 * - Handled: what Salt already applied, with why and one-click rollback.
 */

interface FilterTabProps {
  evidence: GroupedLearningEvidence[];
  admissions: AdmissionDecisions;
  handledWrites: HandledWrite[];
  workspaceId: string;
  onUpdate?: () => void;
}

export function FilterTab({
  evidence,
  admissions,
  handledWrites,
  workspaceId,
  onUpdate,
}: FilterTabProps) {
  const [status, setStatus] = useState<FilterStatus>("watching");

  const counts: Record<FilterStatus, number> = {
    watching: evidence.length + admissions.candidates.length,
    handled: handledWrites.length + admissions.letIn.length,
  };

  return (
    <div className="space-y-6">
      <PlaysSectionHeader
        eyebrow="The transparency layer"
        title="Filter"
        description="What Salt is watching and what it handled — with the reasoning behind every call."
      />

      <FilterStatusPill
        active={status}
        onChange={setStatus}
        counts={counts}
      />

      {status === "watching" && (
        <WatchingSection
          evidence={evidence}
          candidates={admissions.candidates}
          workspaceId={workspaceId}
          onUpdate={onUpdate}
        />
      )}

      {status === "handled" && (
        <HandledSection
          writes={handledWrites}
          letIn={admissions.letIn}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
