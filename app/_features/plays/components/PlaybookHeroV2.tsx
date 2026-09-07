"use client";

import { Clock, ListFilter, Lock, MousePointer, Zap } from "lucide-react";
import { cn } from "@repo/utils";
import {
  getSectionIcon,
  getSectionMeta,
  getSectionColorStyles,
} from "./PlaybookSectionNav";
import { getPlaybookLayerOutcome } from "./PlaybookCardShared";
import { PlaybookHeroControls } from "./PlaybookHeroControls";
import { PlaybookConnectorLogos } from "./PlaybookConnectorLogos";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type { PlaybookSection } from "../playbooks/schema/v2/types";
import type { PlaybookConnectorStats } from "../queries";
import { formatDurationMs, formatMinutes, type PlaybookRunStats } from "../run-stats";
import { getPlaybookTriggerSummary } from "../utils/playbook-display";

interface PlaybookHeroV2Props {
  playbook: PlaybookListItem;
  connectorStats?: PlaybookConnectorStats;
  /** Real run stats over play_runs (Phase 5b). */
  runStats: PlaybookRunStats;
  /** Plays still open (queued / waiting on you). Not counted in run stats. */
  waitingRunCount?: number;
  onEdit: () => void;
  onRan?: () => void;
}

export function PlaybookHeroV2({
  playbook,
  connectorStats,
  runStats,
  waitingRunCount = 0,
  onEdit,
  onRan,
}: PlaybookHeroV2Props) {
  const sectionMeta = getSectionMeta(playbook.section as PlaybookSection);
  const sectionStyles = getSectionColorStyles(playbook.section as PlaybookSection);
  const SectionIcon = getSectionIcon(playbook.section as PlaybookSection);
  const isLocked = playbook.origin === "salt_system";
  const layerOutcome = getPlaybookLayerOutcome(playbook.layer, playbook.voice);

  const isEstimatedRuntime =
    runStats.medianDurationMs === null && runStats.estimatedDurationMs !== null;

  // Warn only when a required category has no connected app — otherwise the
  // stat is just the count; the icons above name the apps.
  const appsHint = connectorStats?.coverage.some(
    (c) => c.required && c.apps.length === 0
  )
    ? `needs a ${connectorStats.coverage
        .filter((c) => c.required && c.apps.length === 0)
        .map((c) => c.category)
        .join(" + ")} app`
    : undefined;

  const saltRuntime =
    runStats.medianDurationMs !== null
      ? formatDurationMs(runStats.medianDurationMs)
      : runStats.estimatedDurationMs !== null
        ? `~${formatDurationMs(runStats.estimatedDurationMs)}`
        : "—";
  const manualMinutes =
    runStats.minutesSavedPerRun !== null && runStats.minutesSavedPerRun > 0
      ? formatMinutes(runStats.minutesSavedPerRun)
      : null;

  const statItems: Array<{
    label: string;
    value: string;
    hint?: string;
    compare?: { value: string; label: string };
    accent?: boolean;
  }> = [
    {
      label: "Apps connected",
      value: String(connectorStats?.connected ?? 0),
      hint: appsHint,
    },
    {
      label: "Runtime",
      value: saltRuntime,
      hint: isEstimatedRuntime
        ? "est."
        : runStats.totalRuns === 0 && !manualMinutes
          ? "no runs yet"
          : undefined,
      compare: manualMinutes
        ? { value: `~${manualMinutes}`, label: "manual" }
        : undefined,
      accent: saltRuntime !== "—",
    },
    {
      label: "Runs this week",
      value: String(runStats.runsThisWeek),
      hint:
        runStats.runsThisWeek === 0
          ? waitingRunCount > 0
            ? `${waitingRunCount} waiting`
            : "none finished yet"
          : undefined,
    },
    {
      label: "Time saved",
      value:
        runStats.totalMinutesSaved !== null
          ? formatMinutes(runStats.totalMinutesSaved)
          : "—",
      hint:
        runStats.totalRuns === 0
          ? waitingRunCount > 0
            ? "after you send"
            : "none finished yet"
          : runStats.minutesSavedPerRun !== null
            ? `~${runStats.minutesSavedPerRun}m × ${runStats.totalRuns} runs`
            : undefined,
    },
  ];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-border/50 bg-card animate-rise",
        sectionStyles.ring
      )}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${sectionStyles.accent} 12%, transparent) 0%, transparent 58%), linear-gradient(180deg, var(--card) 0%, var(--card) 100%)`,
      }}
    >
      <div className="relative z-10 p-7 lg:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <span
              className={cn(
                "size-16 rounded-2xl grid place-items-center shrink-0 relative",
                sectionStyles.bg
              )}
            >
              <SectionIcon
                className={cn("size-7", sectionStyles.text)}
                strokeWidth={2}
              />
              {isLocked ? (
                <span
                  className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background border border-border grid place-items-center"
                  title="System playbook"
                >
                  <Lock className="size-2.5 text-muted-foreground" strokeWidth={2.25} />
                </span>
              ) : null}
            </span>

            <div className="min-w-0">
              <p
                className={cn(
                  "text-[10px] uppercase tracking-[0.16em] font-bold",
                  sectionStyles.text
                )}
              >
                {sectionMeta.label} Playbook
              </p>
              <h1 className="font-display text-4xl lg:text-[52px] leading-[0.95] tracking-tight mt-1 text-foreground">
                {playbook.name}
              </h1>
            </div>
          </div>

          <PlaybookHeroControls
            slug={playbook.slug}
            enabled={playbook.enabled ?? true}
            isLocked={isLocked}
            runnable={playbook.runnable}
            onEdit={onEdit}
            onRan={onRan}
          />
        </div>

        <p className="mt-5 max-w-2xl text-muted-foreground text-lg leading-snug">
          {playbook.description}
        </p>

        {/* The trigger, stated plainly — the thing a user will edit first. */}
        <div className="mt-4 flex items-center gap-2">
          {(() => {
            const trigger = getPlaybookTriggerSummary(
              playbook.triggerType,
              playbook.triggerValue
            );
            const TriggerIcon =
              trigger.kind === "signal"
                ? Zap
                : trigger.kind === "schedule"
                  ? Clock
                  : trigger.kind === "record_condition"
                    ? ListFilter
                    : MousePointer;
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium",
                  "border-border/60 bg-background/50 text-foreground/80"
                )}
              >
                <TriggerIcon
                  className={cn("size-3.5", sectionStyles.text)}
                  strokeWidth={2.25}
                />
                {trigger.text}
              </span>
            );
          })()}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <PlaybookConnectorLogos
            ids={
              (connectorStats && connectorStats.connectedCatalogIds.length > 0
                ? connectorStats.connectedCatalogIds
                : playbook.connectorIds) as ConnectorCatalogId[]
            }
          />
          <p className="text-sm text-muted-foreground/80">{layerOutcome}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3"
              title={
                item.compare
                  ? `Salt: ${item.value}. Manual: ${item.compare.value}.`
                  : undefined
              }
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "font-display text-2xl tabular-nums leading-none",
                    item.accent ? sectionStyles.text : "text-foreground"
                  )}
                >
                  {item.value}
                </span>
                {item.compare ? (
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[13px] font-semibold tabular-nums text-muted-foreground line-through decoration-2 decoration-muted-foreground/70">
                      {item.compare.value}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {item.compare.label}
                    </span>
                  </span>
                ) : null}
                {item.hint ? (
                  <span className="text-[11px] text-muted-foreground/70">
                    {item.hint}
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
