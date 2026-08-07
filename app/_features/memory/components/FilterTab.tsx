"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { PlaysTabEmptyState } from "@/app/_features/plays/components/PlaysTabEmptyState";
import {
  FilterStatusPill,
  type FilterStatus,
} from "./FilterStatusPill";
import { WatchingSection } from "./WatchingSection";
import { HandledSection } from "./HandledSection";
import type { GroupedLearningEvidence } from "../queries/learning-evidence";
import type {
  AdmissionDecisions,
  AdmissionItem,
} from "../queries/admission-decisions";
import type { HandledWrite } from "../queries/handled-items";
import { moveKeptOutToWatching } from "../actions/admission-decisions";

/**
 * Memory → Filter — the transparency surface.
 *
 * One pill, three views:
 * - Watching: what Salt is still gathering confidence on (nudges teach the bar).
 * - Handled: what Salt already applied, with why and one-click rollback.
 * - Kept out: what never made it in, with the reason.
 */

interface FilterTabProps {
  evidence: GroupedLearningEvidence[];
  admissions: AdmissionDecisions;
  handledWrites: HandledWrite[];
  workspaceId: string;
  onUpdate?: () => void;
}

function KeptOutSection({
  keptOutCount,
  keptOutSample,
  workspaceId,
  onUpdate,
}: {
  keptOutCount: number;
  keptOutSample: AdmissionItem[];
  workspaceId: string;
  onUpdate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleLetThisIn = (captureId: string) => {
    startTransition(async () => {
      await moveKeptOutToWatching(captureId, workspaceId);
      onUpdate?.();
    });
  };

  if (keptOutCount === 0 && keptOutSample.length === 0) {
    return (
      <PlaysTabEmptyState
        icon={ShieldX}
        title="Nothing kept out this week"
        description="When Salt decides something isn't worth your attention, it lands here with the reason — so you can check its judgment."
      />
    );
  }

  return (
    <section className="relative space-y-3">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">
        Salt kept {keptOutCount}{" "}
        {keptOutCount === 1 ? "capture" : "captures"} out of your world this
        week. Moving one back puts it on Watching — not straight in.
      </p>
      {keptOutSample.length > 0 && (
        <ul className="space-y-2">
          {keptOutSample.map((item) => (
            <li
              key={item.captureId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.title ?? "Untitled capture"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.fromLabel ?? item.sourceType.replace(/_/g, " ")}
                  {item.reason ? ` — ${item.reason}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLetThisIn(item.captureId)}
                disabled={isPending}
                className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                Actually, let this in
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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
    kept_out: admissions.keptOutCount,
  };

  return (
    <div className="space-y-6">
      <PlaysSectionHeader
        eyebrow="The transparency layer"
        title="Filter"
        description="What Salt is watching, what it handled, and what it kept out — with the reasoning behind every call."
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

      {status === "kept_out" && (
        <KeptOutSection
          keptOutCount={admissions.keptOutCount}
          keptOutSample={admissions.keptOutSample}
          workspaceId={workspaceId}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
