"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { syncAndScanCaptures } from "@/app/_features/capture/actions/run-intelligence-scan";
import {
  PLAYERS,
  TONE_SOFT,
  type PlayerId,
  type QueuePlay,
} from "@/app/_lib/demo/plays-demo-data";
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
import { PlayQueueList } from "./PlayCard/PlayQueueList";
import { mapFindingToCard } from "../play-card/map-finding-to-card";
import { mapQueuePlayToCard } from "../play-card/map-queue-play-to-card";
import { mapHandledFindingToCard } from "../play-card/map-handled-finding-to-card";
import { validatePlayCard } from "../play-card/validate-play-card";
import type { PlayCardViewModel } from "../play-card/types";
import { PlaysPageSkeleton } from "./PlaysPageSkeleton";
import { AutoHandledTimeline } from "./AutoHandledTimeline";
import { PlaysFilterGroupsContent } from "./PlaysFilterPopover";
import { PlaysSearchField } from "./PlaysSearchField";
import type { PlaysActivityView, PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import { usePlaysTabCache, type PlaysTabData } from "../hooks/usePlaysTabCache";

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

function getFindingPlayerId(finding: FindingWithContext): PlayerId {
  const metadata = finding.evidence?.metadata;
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).keeper_profile === true
  ) {
    return "keeper";
  }
  if (finding.finding_type.startsWith("revenue_")) return "client-risk";
  if (finding.finding_type.startsWith("pending_")) return "follow-up";
  if (
    finding.finding_type === "needs_routing" ||
    finding.finding_type === "new_person" ||
    finding.finding_type === "new_org"
  ) {
    return "keeper";
  }
  return "brief";
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

function playMatchesSearch(play: QueuePlay, term: string): boolean {
  if (!term) return true;
  return [
    play.subject,
    play.summary,
    play.recipient,
    play.source,
    play.channel,
    play.playbook,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(term));
}

export function PlaysPage({
  initialTab,
  initialActivityView,
  initialQueueFilter,
  initialData,
}: {
  initialTab: PlaysTab;
  initialActivityView: PlaysActivityView;
  initialQueueFilter: "needs_you" | "auto_handled";
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
    connectors,
    initialFindings,
    autoHandledFindings,
    streamCaptures,
    captureStats,
    hasCaptureData,
    blueprints,
    adoptedTemplates,
    playerContexts,
    workspaceId,
    keeperUnseenCount,
  } = activeData ?? initialData;

  function handleEditCard(vm: PlayCardViewModel) {
    openAskSalt({
      prompt: `Edit this Play before it sends — `,
      context: vm.askSalt,
    });
  }

  const showCreatePlay = tab === "queue";

  const [isPipelinePending, startPipelineTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [queueSearch, setQueueSearch] = useState("");
  const [queuePlayerFilter, setQueuePlayerFilter] = useState<PlayerId | "all">("all");

  const normalizedQueueSearch = queueSearch.trim().toLowerCase();
  const hasActiveQueueFilter =
    normalizedQueueSearch.length > 0 || queuePlayerFilter !== "all";

  const filteredFindings = useMemo(
    () =>
      initialFindings.filter((finding) => {
        if (queuePlayerFilter !== "all" && getFindingPlayerId(finding) !== queuePlayerFilter) {
          return false;
        }
        return findingMatchesSearch(finding, normalizedQueueSearch);
      }),
    [initialFindings, normalizedQueueSearch, queuePlayerFilter]
  );

  const filteredAutoHandledFindings = useMemo(
    () =>
      autoHandledFindings.filter((finding) => {
        if (queuePlayerFilter !== "all" && getFindingPlayerId(finding) !== queuePlayerFilter) {
          return false;
        }
        return findingMatchesSearch(finding, normalizedQueueSearch);
      }),
    [autoHandledFindings, normalizedQueueSearch, queuePlayerFilter]
  );

  const filteredQueue = useMemo(
    () =>
      initialQueue.filter((play) => {
        if (queuePlayerFilter !== "all" && play.playerId !== queuePlayerFilter) {
          return false;
        }
        return playMatchesSearch(play, normalizedQueueSearch);
      }),
    [initialQueue, normalizedQueueSearch, queuePlayerFilter]
  );

  // Unify findings (scan signals shown as plays) and prepared plays into one
  // ordered list of view models, rendered by the single PlayCard.
  const queueCards = useMemo<PlayCardViewModel[]>(
    () => [
      ...filteredFindings.map(mapFindingToCard),
      ...filteredQueue.map(mapQueuePlayToCard),
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
        ...initialQueue.map(mapQueuePlayToCard),
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
  };

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        {/* Tab Bar + Create Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PlaysTabs active={tab} onChange={handleTabChange} />
          {showCreatePlay && (
            <div className="flex items-center gap-2">
              {/* Debug affordance (dev builds only): production ingestion is
                  the trigger webhook + paginated backfill; this manual path
                  exists to exercise the pipeline locally. */}
              {process.env.NODE_ENV === "development" && (
                <button
                  type="button"
                  onClick={handleSyncAndScan}
                  disabled={isPipelinePending}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-amber-500/50 bg-amber-500/10 pl-3 pr-4 text-[13px] font-medium text-amber-600 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {isPipelinePending ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Zap className="size-4" strokeWidth={2} />
                  )}
                  {isPipelinePending ? "Syncing & scanning..." : "Sync & Scan"}
                </button>
              )}

              <button
                type="button"
                onClick={() => openAskSalt()}
                className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card pl-3 pr-4 text-[13px] font-semibold text-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] transition hover:bg-card/90 hover-lift"
              >
                <Sparkles className="size-4 text-flame" strokeWidth={2.25} />
                Create a Play
              </button>
            </div>
          )}
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
                  eyebrow={queueFilter === "needs_you" ? "Needs your attention" : "Salt handled"}
                  title={queueFilter === "needs_you" ? "Needs You" : "Auto-handled"}
                  description={
                    queueFilter === "needs_you"
                      ? "Unresolved decisions waiting for you. Approve, edit, apply, or dismiss."
                      : "Recent confident Keeper and Salt updates. Activity keeps the full history."
                  }
                />
                <QueueToggle
                  active={queueFilter}
                  onChange={handleQueueFilterChange}
                  counts={queueCounts}
                />
              </div>

              <PlaysSearchField
                layout="toolbar-actions"
                value={queueSearch}
                onChange={setQueueSearch}
                placeholder={
                  queueFilter === "needs_you"
                    ? "Search queued plays"
                    : "Search handled updates"
                }
                filterActive={queuePlayerFilter !== "all"}
                filterContent={
                  <PlaysFilterGroupsContent
                    groups={[
                      {
                        label: "From",
                        options: PLAYERS.map((player) => ({
                          id: player.id,
                          label: player.name,
                          monogram: player.monogram,
                          swatchClass: TONE_SOFT[player.tone],
                        })),
                        value: queuePlayerFilter === "all" ? null : queuePlayerFilter,
                        onChange: (id) => setQueuePlayerFilter((id as PlayerId) ?? "all"),
                      },
                    ]}
                  />
                }
                displayContent={
                  <div className="border-b border-border/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-foreground">Display</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {queueFilter === "needs_you"
                        ? "Choose how queued plays are shown"
                        : "Choose how auto-handled updates are shown"}
                    </p>
                  </div>
                }
              />

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
                blueprints={blueprints}
                adoptedTemplates={adoptedTemplates}
                playerContexts={playerContexts}
                workspaceId={workspaceId ?? ""}
                onBlueprintAdopted={invalidateActiveTab}
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
                <ActivityTab initialActivity={initialActivity} />
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

