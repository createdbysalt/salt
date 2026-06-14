"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { runIntelligenceScan } from "@/app/_features/capture/actions/run-intelligence-scan";
import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import { ActivityTab } from "./ActivityTab";
import { PlaysListView } from "./PlaysListView";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import { PlaysTabs, type PlaysTab } from "./PlaysTabs";
import { QueueToggle, type QueueFilter } from "./QueueToggle";
import { CustomizeTab } from "./CustomizeTab";
import { FindingsList } from "./FindingsList";

/**
 * Plays Page — Redesigned 2026-06-13
 *
 * New structure:
 * - Queue: Daily attention (Needs You / Auto-handled toggle)
 * - Customize: Players, Playbooks, Connectors
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

function parsePlaysTab(value: string | null): PlaysTab {
  if (value === "customize" || value === "activity") {
    return value;
  }
  return "queue";
}

function parseQueueFilter(value: string | null): QueueFilter {
  if (value === "auto_handled") {
    return "auto_handled";
  }
  return "needs_you";
}

export function PlaysPage({
  initialQueue,
  initialActivity,
  connectors,
  initialFindings,
  findingCounts,
}: {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData;
  initialFindings: FindingWithContext[];
  findingCounts: { needs_you: number; auto_handled: number };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PlaysTab>(() => parsePlaysTab(searchParams.get("tab")));
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(() =>
    parseQueueFilter(searchParams.get("filter"))
  );

  useEffect(() => {
    setTab(parsePlaysTab(searchParams.get("tab")));
    setQueueFilter(parseQueueFilter(searchParams.get("filter")));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (nextTab: PlaysTab) => {
      setTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "queue") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      // Reset filter when changing tabs
      params.delete("filter");
      const query = params.toString();
      router.replace(query ? `/plays?${query}` : "/plays", { scroll: false });
    },
    [router, searchParams],
  );

  const handleQueueFilterChange = useCallback(
    (nextFilter: QueueFilter) => {
      setQueueFilter(nextFilter);
      const params = new URLSearchParams(searchParams.toString());
      if (nextFilter === "needs_you") {
        params.delete("filter");
      } else {
        params.set("filter", nextFilter);
      }
      const query = params.toString();
      router.replace(query ? `/plays?${query}` : "/plays", { scroll: false });
    },
    [router, searchParams],
  );

  function handleEditPlay(play: QueuePlay) {
    openAskSalt({
      prompt: `Edit this Play before it sends — `,
      context: {
        type: "play",
        id: play.id,
        title: play.subject,
        recipientLabel: play.recipient,
        sourceLabel: play.source,
        href: "/plays",
      },
    });
  }

  const showCreatePlay = tab === "queue";

  // Scan state
  const [isPending, startTransition] = useTransition();
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRunScan = () => {
    setScanResult(null);
    startTransition(async () => {
      const result = await runIntelligenceScan({ lookbackHours: 168, maxEmails: 50 });
      if (result.success && result.result) {
        setScanResult({
          success: true,
          message: `Scanned ${result.result.emailsProcessed} emails, found ${result.result.findingsCreated} findings`,
        });
        router.refresh();
      } else {
        setScanResult({
          success: false,
          message: result.error || "Scan failed",
        });
      }
    });
  };

  // Combine legacy plays count with new findings count
  const queueCounts = {
    needs_you: initialQueue.length + findingCounts.needs_you,
    auto_handled: findingCounts.auto_handled,
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
              {/* Dev: Run Scan Button */}
              <button
                type="button"
                onClick={handleRunScan}
                disabled={isPending}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-amber-500/50 bg-amber-500/10 pl-3 pr-4 text-[13px] font-medium text-amber-600 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Zap className="size-4" strokeWidth={2} />
                )}
                {isPending ? "Scanning..." : "Run Scan"}
              </button>

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

        {/* Scan Result Toast */}
        {scanResult && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              scanResult.success
                ? "border-green-500/30 bg-green-500/10 text-green-600"
                : "border-red-500/30 bg-red-500/10 text-red-600"
            }`}
          >
            {scanResult.message}
            <button
              type="button"
              onClick={() => setScanResult(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

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
                      ? "Approve, edit, or dismiss what Salt has prepared. Nothing happens without you."
                      : "What Salt handled confidently. Review anytime to audit or correct."
                  }
                />
                <QueueToggle
                  active={queueFilter}
                  onChange={handleQueueFilterChange}
                  counts={queueCounts}
                />
              </div>

              {/* Queue Content */}
              {queueFilter === "needs_you" ? (
                <div className="space-y-8">
                  {/* Intelligence Findings (people-centric) */}
                  {initialFindings.length > 0 && (
                    <section>
                      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                        Intelligence
                      </h3>
                      <FindingsList findings={initialFindings} />
                    </section>
                  )}

                  {/* Legacy Plays (prepared actions) */}
                  {initialQueue.length > 0 && (
                    <section>
                      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                        Prepared Actions
                      </h3>
                      <PlaysListView
                        onEditPlay={handleEditPlay}
                        initialQueue={initialQueue}
                      />
                    </section>
                  )}

                  {/* Empty state when both are empty */}
                  {initialFindings.length === 0 && initialQueue.length === 0 && (
                    <FindingsList
                      findings={[]}
                      emptyMessage="Queue clear"
                      emptyDescription="Salt's drafting the next batch. Check back soon."
                    />
                  )}
                </div>
              ) : (
                <AutoHandledList />
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
              <CustomizeTab connectors={connectors} />
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
                eyebrow="Trust ledger"
                title="Activity"
                description="Everything Salt has done, approved, or learned from. A complete record of what shipped and why."
              />
              <ActivityTab initialActivity={initialActivity} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Auto-handled List — Placeholder
 * TODO: Wire to real auto_handled findings from intelligence_findings table
 */
function AutoHandledList() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Items Salt handled with high confidence will appear here.
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Connect more apps to improve Salt&apos;s confidence.
      </p>
    </div>
  );
}
