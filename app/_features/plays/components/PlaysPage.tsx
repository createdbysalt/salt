"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlayRunRow } from "../types";
import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import {
  FINDING_TYPE_LABELS,
  type FindingWithContext,
} from "@/app/_features/capture/types/intelligence-findings";
import { ActivityTab } from "./ActivityTab";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import { PlaysTabs } from "./PlaysTabs";
import { QueueToggle } from "./QueueToggle";
import { PlaybooksTab } from "./PlaybooksTab";
import { getSectionMeta } from "./PlaybookSectionNav";
import { PlayQueueList } from "./PlayCard/PlayQueueList";
import { mapFindingToCard } from "../play-card/map-finding-to-card";
import { mapPlayRunToCardClient } from "../play-card/map-play-run-to-card-client";
import { mapHandledFindingToCard } from "../play-card/map-handled-finding-to-card";
import { validatePlayCard } from "../play-card/validate-play-card";
import { sortQueueCards } from "../lib/queue-sort";
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
  getSectionFromPlayRun,
  matchesSectionFilter,
  QUEUE_SECTION_ORDER,
  type QueueSectionFilter,
} from "../utils/queue-section";
import type { PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import { usePlaysTabCache } from "../hooks/usePlaysTabCache";
import type { PlaysTabData } from "../plays-tab-data";
import { usePlayRunsRealtime } from "../hooks/usePlayRunsRealtime";
import type { HqBriefingData } from "@/app/_features/plays/types";
import type { HqSideRailData } from "@/app/_features/hq/types";

/**
 * Plays Page — what Salt is doing, and what it needs from you.
 *
 * Structure (2026-08-06 reorg):
 * - Queue: Action approvals (Needs You / Auto-handled)
 * - Playbooks: the library
 * - Activity: Actions audit trail
 *
 * Intake (Connectors / Activity) lives in Sources; memory-admission decisions
 * live in Memory → Filter.
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

function mapAutoHandledRunToCard(play: PlayRunRow): PlayCardViewModel {
  const card = mapPlayRunToCardClient(play);
  return {
    ...card,
    mode: "handled",
    primaryAction: null,
    canFlag: false,
    canSchedule: false,
    handled: {
      outcomeLabel: play.title,
      changeLine: play.preview,
      handledAt: play.approved_at ?? play.ran_at ?? play.created_at,
    },
  };
}

export function PlaysPage({
  initialTab,
  initialQueueFilter,
  initialData,
  sideRail,
  briefing,
}: {
  initialTab: PlaysTab;
  initialQueueFilter: "needs_you" | "auto_handled";
  initialData: PlaysTabData;
  sideRail?: HqSideRailData;
  briefing?: HqBriefingData;
}) {
  const {
    tab,
    queueFilter,
    activeData,
    isTabLoading,
    handleTabChange,
    handleQueueFilterChange,
    invalidateActiveTab,
  } = usePlaysTabCache({
    tab: initialTab,
    queueFilter: initialQueueFilter,
    data: initialData,
  });

  const {
    initialQueue,
    initialActivity,
    activityTotalCount,
    initialFindings,
    autoHandledFindings,
    autoHandledRuns,
    playbooksV2,
    workspaceId,
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
    } else {
      for (const finding of autoHandledFindings) {
        const section = getSectionFromFindingType(finding.finding_type);
        counts.set(section, (counts.get(section) ?? 0) + 1);
      }
      for (const play of autoHandledRuns) {
        const section = getSectionFromPlayRun(play);
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
    autoHandledRuns,
    initialFindings,
    initialQueue,
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

  const filteredAutoHandledRuns = useMemo(
    () =>
      autoHandledRuns.filter((play) => {
        if (
          !matchesSectionFilter(
            queueFilters.sections,
            getSectionFromPlayRun(play),
          )
        ) {
          return false;
        }
        return playMatchesSearch(play, normalizedQueueSearch);
      }),
    [autoHandledRuns, normalizedQueueSearch, queueFilters]
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

  // Unify findings (scan signals shown as plays) and prepared plays into one
  // ordered list of view models, rendered by the single PlayCard.
  // Order: money at risk → time-sensitive → newest (spec Q11).
  const queueCards = useMemo<PlayCardViewModel[]>(
    () =>
      sortQueueCards([
        ...filteredFindings.map(mapFindingToCard),
        ...filteredQueue.map(mapPlayRunToCardClient),
      ]),
    [filteredFindings, filteredQueue]
  );

  const autoHandledCards = useMemo<PlayCardViewModel[]>(
    () => [
      ...filteredAutoHandledFindings.map(mapHandledFindingToCard),
      ...filteredAutoHandledRuns.map(mapAutoHandledRunToCard),
    ].sort((a, b) => {
      const aTime = a.handled?.handledAt ? new Date(a.handled.handledAt).getTime() : 0;
      const bTime = b.handled?.handledAt ? new Date(b.handled.handledAt).getTime() : 0;
      return bTime - aTime;
    }),
    [filteredAutoHandledFindings, filteredAutoHandledRuns],
  );

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

  // Same contract as needsYouCount: the badge counts what the list can
  // actually render (validated mapped cards), so the number on the toggle
  // always matches the cards below it.
  const autoHandledCount = useMemo(
    () =>
      [
        ...autoHandledFindings.map(mapHandledFindingToCard),
        ...autoHandledRuns.map(mapAutoHandledRunToCard),
      ].filter((vm) => validatePlayCard(vm).ok).length,
    [autoHandledFindings, autoHandledRuns]
  );

  const queueCounts = {
    needs_you: needsYouCount,
    auto_handled: autoHandledCount,
  };

  return (
    <div className="relative min-h-full">
      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        {/* Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PlaysTabs active={tab} onChange={handleTabChange} />
        </div>

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
                      : "Salt handled"
                  }
                  title={
                    queueFilter === "needs_you"
                      ? "Needs You"
                      : "Auto-handled"
                  }
                  description={
                    queueFilter === "needs_you"
                      ? "Unresolved decisions waiting for you. Approve, edit, apply, or dismiss."
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
                      : "Salt is reading your connected accounts — your next plays land here."
                  }
                />
              ) : (
                <AutoHandledTimeline
                  findings={filteredAutoHandledFindings}
                  cards={autoHandledCards}
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

          {/* PLAYBOOKS TAB */}
          {tab === "playbooks" && (
            <motion.div
              key="playbooks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PlaybooksTab
                playbooksV2={playbooksV2}
                workspaceId={workspaceId ?? ""}
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
              <PlaysSectionHeader
                eyebrow="All actions taken"
                title="Activity"
                description="Everything Salt has done, approved, or learned from. A complete record of what shipped and why."
              />
              <ActivityTab
                initialActivity={initialActivity}
                initialTotalCount={activityTotalCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
