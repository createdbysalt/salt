"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { syncAndScanCaptures } from "@/app/_features/capture/actions/run-intelligence-scan";
import type { PlayRunRow } from "../types";
import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import {
  FINDING_TYPE_LABELS,
  type FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";
import { ActivityTab } from "./ActivityTab";
import { ActivityViewToggle, type ActivityView } from "./ActivityViewToggle";
import { CaptureStreamTab } from "@/app/_features/capture/components/CaptureStreamTab";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import { PlaysTabs } from "./PlaysTabs";
import { QueueToggle } from "./QueueToggle";
import { CustomizeTab } from "./CustomizeTab";
import { getSectionMeta } from "./PlaybookSectionNav";
import { PlayQueueList } from "./PlayCard/PlayQueueList";
import { LearningTab } from "./LearningTab";
import { mapFindingToCard } from "../play-card/map-finding-to-card";
import { mapPlayRunToCardClient } from "../play-card/map-play-run-to-card-client";
import { mapHandledFindingToCard } from "../play-card/map-handled-finding-to-card";
import { validatePlayCard } from "../play-card/validate-play-card";
import type { PlayCardViewModel } from "../play-card/types";
import { PlaysPageSkeleton } from "./PlaysPageSkeleton";
import { AutoHandledTimeline } from "./AutoHandledTimeline";
import { PlaysSearchField } from "./PlaysSearchField";
import {
  countQueueFilters,
  EMPTY_QUEUE_FILTERS,
  matchesItemKindFilter,
  QueueActiveFilterBadges,
  QueueFilterPanel,
  QUEUE_ITEM_KIND_LABELS,
  type QueueFiltersState,
  type QueueItemKindFilter,
} from "./QueueFilterMenu";
import {
  getSectionFromFindingType,
  getSectionFromLearningEntity,
  getSectionFromPlayRun,
  matchesSectionFilter,
  QUEUE_SECTION_ORDER,
  type QueueSectionFilter,
} from "../utils/queue-section";
import type { PlaysActivityView, PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import { usePlaysTabCache, type PlaysTabData } from "../hooks/usePlaysTabCache";
import { usePlayRunsRealtime } from "../hooks/usePlayRunsRealtime";

/**
 * Plays Page — Redesigned 2026-06-13
 *
 * New structure:
 * - Queue: Daily attention (Needs You / Auto-handled toggle)
 * - Customize: Playbooks, Connectors
 * - Activity: Audit trail
 *
 * Capture has been folded into Plays. The Queue now shows:
 * - Findings about people (revenue signals, new contacts, pending actions)
 * - Prepared actions (drafts ready to send)
 */

function openAskSalt(options?: {
  prompt?: string;
  context?: AskSaltContext | null;
}) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: options?.prompt ?? "",
        mode: "ask" as const,
        context: options?.context ?? null,
        autoSubmit: false,
      },
    })
  );
}

function parseActivityView(value: PlaysActivityView): ActivityView {
  return value === "captures" ? "captures" : "actions";
}

function findingMatchesSearch(finding: FindingWithContext, term: string): boolean {
  if (!term) return true;
  return [
    finding.title,
    finding.content,
    finding.person?.name,
    finding.person?.email,
    finding.org?.name,
    FINDING_TYPE_LABELS[finding.finding_type],
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(term));
}

function playMatchesSearch(play: PlayRunRow, term: string): boolean {
  if (!term) return true;
  return [
    play.title,
    play.preview,
    play.recipient_label,
    play.target_label,
    play.channel,
    play.player_name,
    play.source_context?.playbook_slug,
  ]
    .filter(Boolean)
    .some((value) => (value as string)?.toLowerCase().includes(term));
}

export function PlaysPage({
  initialTab,
  initialActivityView,
  initialQueueFilter,
  initialData,
}: {
  initialTab: PlaysTab;
  initialActivityView: PlaysActivityView;
  initialQueueFilter: "needs_you" | "auto_handled" | "learning";
  initialData: PlaysTabData;
}) {
  const {
    tab,
    activityView,
    queueFilter,
    activeData,
    isTabLoading,
    handleTabChange,
    handleQueueFilterChange,
    handleActivityViewChange,
    invalidateActiveTab,
  } = usePlaysTabCache({
    tab: initialTab,
    activityView: parseActivityView(initialActivityView),
    queueFilter: initialQueueFilter,
    data: initialData,
  });

  const {
    initialQueue,
    initialActivity,
    activityTotalCount,
    connectors,
    initialFindings,
    autoHandledFindings,
    learningEvidence,
    streamCaptures,
    captureStats,
    hasCaptureData,
    playbooksV2,
    workspaceId,
    keeperUnseenCount,
  } = activeData ?? initialData;

  // Real-time subscription for play_runs changes
  usePlayRunsRealtime({
    workspaceId,
    enabled: tab === "queue",
    onInsert: invalidateActiveTab,
    onUpdate: invalidateActiveTab,
  });

  function handleEditCard(vm: PlayCardViewModel) {
    openAskSalt({
      prompt: `Edit this Play before it sends — `,
      context: vm.askSalt,
    });
  }


  const [isPipelinePending, startPipelineTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [queueSearch, setQueueSearch] = useState("");
  const [queueFilters, setQueueFilters] = useState<QueueFiltersState>(EMPTY_QUEUE_FILTERS);

  const normalizedQueueSearch = queueSearch.trim().toLowerCase();
  const activeQueueFilterCount = countQueueFilters(queueFilters, queueFilter);
  const hasActiveQueueFilter =
    normalizedQueueSearch.length > 0 || activeQueueFilterCount > 0;

  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        QUEUE_SECTION_ORDER.map((section) => [section, getSectionMeta(section).label]),
      ) as Record<QueueSectionFilter, string>,
    [],
  );

  const queueSectionOptions = useMemo(() => {
    const counts = new Map<QueueSectionFilter, number>();

    if (queueFilter === "needs_you") {
      for (const finding of initialFindings) {
        const section = getSectionFromFindingType(finding.finding_type);
        counts.set(section, (counts.get(section) ?? 0) + 1);
      }
      for (const play of initialQueue) {
        const section = getSectionFromPlayRun(play);
        counts.set(section, (counts.get(section) ?? 0) + 1);
      }
    } else if (queueFilter === "auto_handled") {
      for (const finding of autoHandledFindings) {
        const section = getSectionFromFindingType(finding.finding_type);
        counts.set(section, (counts.get(section) ?? 0) + 1);
      }
    } else {
      for (const item of learningEvidence ?? []) {
        const section = getSectionFromLearningEntity(item.entityType);
        counts.set(section, (counts.get(section) ?? 0) + 1);
      }
    }

    return QUEUE_SECTION_ORDER.filter((section) => (counts.get(section) ?? 0) > 0).map(
      (section) => ({
        id: section,
        label: sectionLabels[section],
        count: counts.get(section) ?? 0,
      }),
    );
  }, [
    autoHandledFindings,
    initialFindings,
    initialQueue,
    learningEvidence,
    queueFilter,
    sectionLabels,
  ]);

  const queueItemKindOptions = useMemo(() => {
    if (queueFilter !== "needs_you") return [];

    const options: Array<{ id: QueueItemKindFilter; label: string; count: number }> = [];
    if (initialFindings.length > 0) {
      options.push({
        id: "finding",
        label: QUEUE_ITEM_KIND_LABELS.finding,
        count: initialFindings.length,
      });
    }
    if (initialQueue.length > 0) {
      options.push({
        id: "prepared_play",
        label: QUEUE_ITEM_KIND_LABELS.prepared_play,
        count: initialQueue.length,
      });
    }
    return options;
  }, [initialFindings.length, initialQueue.length, queueFilter]);

  const filteredFindings = useMemo(
    () =>
      initialFindings.filter((finding) => {
        if (
          !matchesSectionFilter(
            queueFilters.sections,
            getSectionFromFindingType(finding.finding_type),
          )
        ) {
          return false;
        }
        if (!matchesItemKindFilter(queueFilters.itemKinds, "finding")) {
          return false;
        }
        return findingMatchesSearch(finding, normalizedQueueSearch);
      }),
    [initialFindings, normalizedQueueSearch, queueFilters]
  );

  const filteredAutoHandledFindings = useMemo(
    () =>
      autoHandledFindings.filter((finding) => {
        if (
          !matchesSectionFilter(
            queueFilters.sections,
            getSectionFromFindingType(finding.finding_type),
          )
        ) {
          return false;
        }
        return findingMatchesSearch(finding, normalizedQueueSearch);
      }),
    [autoHandledFindings, normalizedQueueSearch, queueFilters]
  );

  const filteredQueue = useMemo(
    () =>
      initialQueue.filter((play) => {
        if (
          !matchesSectionFilter(
            queueFilters.sections,
            getSectionFromPlayRun(play),
          )
        ) {
          return false;
        }
        if (!matchesItemKindFilter(queueFilters.itemKinds, "prepared_play")) {
          return false;
        }
        return playMatchesSearch(play, normalizedQueueSearch);
      }),
    [initialQueue, normalizedQueueSearch, queueFilters]
  );

  const filteredLearningEvidence = useMemo(() => {
    const items = learningEvidence ?? [];
    return items.filter((item) => {
      if (
        !matchesSectionFilter(
          queueFilters.sections,
          getSectionFromLearningEntity(item.entityType),
        )
      ) {
        return false;
      }
      if (!normalizedQueueSearch) return true;
      return (
        item.entityLabel.toLowerCase().includes(normalizedQueueSearch) ||
        item.fields.some((field) =>
          field.fieldPath.toLowerCase().includes(normalizedQueueSearch)
        )
      );
    });
  }, [learningEvidence, normalizedQueueSearch, queueFilters.sections]);

  // Unify findings (scan signals shown as plays) and prepared plays into one
  // ordered list of view models, rendered by the single PlayCard.
  const queueCards = useMemo<PlayCardViewModel[]>(
    () => [
      ...filteredFindings.map(mapFindingToCard),
      ...filteredQueue.map(mapPlayRunToCardClient),
    ],
    [filteredFindings, filteredQueue]
  );

  const handleSyncAndScan = () => {
    setActionResult(null);
    startPipelineTransition(async () => {
      const result = await syncAndScanCaptures({ lookbackDays: 7 });
      if (result.success && result.scan) {
        const syncNote = result.sync
          ? `Synced ${result.sync.capturesCreated} new captures. `
          : "";
        const firstWarning = result.scan.errors[0];
        const errorNote =
          result.scan.errors.length > 0
            ? firstWarning
              ? ` ${firstWarning}`
              : ` (${result.scan.errors.length} warnings)`
            : "";
        const vendorDismissed = result.scan.findingsDismissedAsVendor ?? 0;
        const vendorRepaired = result.scan.findingsMemoryRepaired ?? 0;
        const vendorNote =
          vendorDismissed > 0 || vendorRepaired > 0
            ? ` Cleared ${vendorDismissed} subscription/vendor item(s) from the queue${vendorRepaired > 0 ? `, repaired ${vendorRepaired} finding(s)` : ""}.`
            : "";
        const scanNote =
          result.scan.findingsCreated > 0
            ? `Scanned ${result.scan.emailsProcessed} captures, ${result.scan.findingsCreated} new or updated findings.${vendorNote}`
            : result.scan.emailsProcessed > 0 || vendorDismissed > 0 || vendorRepaired > 0
              ? `Re-scanned ${result.scan.emailsProcessed} captures.${vendorNote || " No new findings yet — try structural subjects like training sessions or deliverables ready for review."}`
              : "No captures in the lookback window needed scanning. Sync Gmail first at /connections if the stream is empty.";
        setActionResult({
          success: result.scan.errors.length === 0 || result.scan.emailsProcessed > 0,
          message: `${syncNote}${scanNote}${errorNote}`,
        });
        invalidateActiveTab();
      } else {
        setActionResult({
          success: false,
          message: result.error || "Sync and scan failed",
        });
      }
    });
  };

  // Count what the queue can actually render (valid, mapped cards), not the raw
  // server finding count — otherwise non-renderable findings inflate the badge
  // and you see "1" with an empty list.
  const needsYouCount = useMemo(
    () =>
      [
        ...initialFindings.map(mapFindingToCard),
        ...initialQueue.map(mapPlayRunToCardClient),
      ].filter((vm) => validatePlayCard(vm).ok).length,
    [initialFindings, initialQueue]
  );

  const autoHandledCount = useMemo(
    () =>
      autoHandledFindings
        .map(mapHandledFindingToCard)
        .filter((vm) => validatePlayCard(vm).ok).length,
    [autoHandledFindings]
  );

  const queueCounts = {
    needs_you: needsYouCount,
    auto_handled: autoHandledCount,
    learning: learningEvidence?.length ?? 0,
  };

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        {/* Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PlaysTabs active={tab} onChange={handleTabChange} />
        </div>

        {/* Sync / Scan result toast */}
        {actionResult && (
          <div
            className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
              actionResult.success
                ? "border-green-500/30 bg-green-500/10 text-green-600"
                : "border-red-500/30 bg-red-500/10 text-red-600"
            }`}
          >
            <span className="min-w-0 flex-1">{actionResult.message}</span>
            <button
              type="button"
              onClick={() => setActionResult(null)}
              className="shrink-0 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isTabLoading ? (
          <PlaysPageSkeleton tab={tab} />
        ) : (
        <AnimatePresence mode="wait">
          {/* QUEUE TAB */}
          {tab === "queue" && (
            <motion.div
              key="queue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header with Toggle */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <PlaysSectionHeader
                  eyebrow={
                    queueFilter === "needs_you"
                      ? "Needs your attention"
                      : queueFilter === "learning"
                        ? "Building confidence"
                        : "Salt handled"
                  }
                  title={
                    queueFilter === "needs_you"
                      ? "Needs You"
                      : queueFilter === "learning"
                        ? "Watching"
                        : "Auto-handled"
                  }
                  description={
                    queueFilter === "needs_you"
                      ? "Unresolved decisions waiting for you. Approve, edit, apply, or dismiss."
                      : queueFilter === "learning"
                        ? "Salt is gathering signals. Accept when ready, or wait for more evidence."
                        : "Recent confident Memory and Salt updates. Activity keeps the full history."
                  }
                />
                <QueueToggle
                  active={queueFilter}
                  onChange={handleQueueFilterChange}
                  counts={queueCounts}
                />
              </div>

              <div className="space-y-3">
                <PlaysSearchField
                  value={queueSearch}
                  onChange={setQueueSearch}
                  placeholder={
                    queueFilter === "needs_you"
                      ? "Search queued plays"
                      : queueFilter === "learning"
                        ? "Search watching…"
                        : "Search handled updates"
                  }
                  filterActive={activeQueueFilterCount > 0}
                  filterActiveCount={activeQueueFilterCount}
                  filterTitle=""
                  filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
                  filterContent={
                    <QueueFilterPanel
                      tab={queueFilter}
                      state={queueFilters}
                      onChange={setQueueFilters}
                      sectionOptions={queueSectionOptions}
                      itemKindOptions={queueItemKindOptions}
                    />
                  }
                  trailingAction={
                    process.env.NODE_ENV === "development" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSyncAndScan}
                        disabled={isPipelinePending}
                        className={cn(
                          "h-9 shrink-0 rounded-full border-border/60 bg-card px-3.5 gap-1.5 text-sm font-medium text-foreground shadow-none hover:border-border hover:bg-muted/40",
                        )}
                      >
                        {isPipelinePending ? (
                          <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
                        ) : (
                          <Zap className="size-3.5" strokeWidth={2.25} />
                        )}
                        {isPipelinePending ? "Syncing…" : "Sync & Scan"}
                      </Button>
                    ) : undefined
                  }
                />

                <QueueActiveFilterBadges
                  tab={queueFilter}
                  state={queueFilters}
                  onChange={setQueueFilters}
                  sectionLabels={sectionLabels}
                />
              </div>

              {/* Queue Content — one unified PlayCard list for every item */}
              {queueFilter === "needs_you" ? (
                <PlayQueueList
                  cards={queueCards}
                  onEditWithSalt={handleEditCard}
                  emptyMessage={
                    hasActiveQueueFilter ? "No queued items match" : "Queue clear"
                  }
                  emptyDescription={
                    hasActiveQueueFilter
                      ? "Try clearing search or adjusting the filters."
                      : "Salt's drafting the next batch. Check back soon."
                  }
                />
              ) : queueFilter === "learning" ? (
                <LearningTab
                  evidence={filteredLearningEvidence}
                  workspaceId={workspaceId ?? ""}
                  onUpdate={invalidateActiveTab}
                  emptyTitle={
                    hasActiveQueueFilter ? "No matching evidence" : undefined
                  }
                  emptyDescription={
                    hasActiveQueueFilter
                      ? "Try clearing search or adjusting the filters."
                      : undefined
                  }
                />
              ) : (
                <AutoHandledTimeline
                  findings={filteredAutoHandledFindings}
                  emptyMessage={hasActiveQueueFilter ? "No handled items match" : undefined}
                  emptyDescription={
                    hasActiveQueueFilter
                      ? "Try clearing search or adjusting the filters."
                      : undefined
                  }
                />
              )}
            </motion.div>
          )}

          {/* CUSTOMIZE TAB */}
          {tab === "customize" && (
            <motion.div
              key="customize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CustomizeTab
                connectors={connectors}
                playbooksV2={playbooksV2}
                workspaceId={workspaceId ?? ""}
                keeperUnseenCount={keeperUnseenCount}
              />
            </motion.div>
          )}

          {/* ACTIVITY TAB */}
          {tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <PlaysSectionHeader
                  eyebrow={
                    activityView === "captures"
                      ? "All captured context"
                      : "Trust ledger"
                  }
                  title={activityView === "captures" ? "Captures" : "Activity"}
                  description={
                    activityView === "captures"
                      ? "Everything Salt saw from connected apps — a complete record of context entering your system."
                      : "Everything Salt has done, approved, or learned from. A complete record of what shipped and why."
                  }
                />
                <ActivityViewToggle
                  active={activityView}
                  onChange={handleActivityViewChange}
                />
              </div>
              {activityView === "actions" ? (
                <ActivityTab
                  initialActivity={initialActivity}
                  initialTotalCount={activityTotalCount}
                />
              ) : (
                <CaptureStreamTab
                  realStreamCaptures={streamCaptures}
                  realStats={captureStats}
                  hasRealData={hasCaptureData}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}

