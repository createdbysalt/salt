"use client";

import { Lock } from "lucide-react";
import { cn } from "@repo/utils";
import {
  getSectionIcon,
  getSectionMeta,
  getSectionColorStyles,
} from "./PlaybookSectionNav";
import {
  getPlaybookLayerOutcome,
  PlaybookStatusControl,
} from "./PlaybookCardShared";
import { PlaybookConnectorLogos } from "./PlaybookConnectorLogos";
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type { PlaybookSection } from "../playbooks/schema/v2/types";
import type { PlaybookConnectorStats } from "../queries";
import { formatDurationMs, formatMinutes, type PlaybookRunStats } from "../run-stats";

interface PlaybookHeroV2Props {
  playbook: PlaybookListItem;
  connectorStats?: PlaybookConnectorStats;
  /** Real run stats over play_runs (Phase 5b). */
  runStats: PlaybookRunStats;
}

export function PlaybookHeroV2({
  playbook,
  connectorStats,
  runStats,
}: PlaybookHeroV2Props) {
  const sectionMeta = getSectionMeta(playbook.section as PlaybookSection);
  const sectionStyles = getSectionColorStyles(playbook.section as PlaybookSection);
  const SectionIcon = getSectionIcon(playbook.section as PlaybookSection);
  const isLocked = playbook.origin === "salt_system";
  const layerOutcome = getPlaybookLayerOutcome(playbook.layer, playbook.voice);

  const isEstimatedRuntime =
    runStats.medianDurationMs === null && runStats.estimatedDurationMs !== null;

  const statItems = [
    {
      label: "Apps connected",
      value: String(connectorStats?.connected ?? 0),
      hint:
        connectorStats && connectorStats.required > 0
          ? `${connectorStats.requiredCovered} of ${connectorStats.required} required`
          : undefined,
    },
    {
      label: "Runtime",
      value:
        runStats.medianDurationMs !== null
          ? formatDurationMs(runStats.medianDurationMs)
          : runStats.estimatedDurationMs !== null
            ? `~${formatDurationMs(runStats.estimatedDurationMs)}`
            : "—",
      hint: [
        isEstimatedRuntime ? "est." : null,
        runStats.minutesSavedPerRun !== null
          ? `vs ~${runStats.minutesSavedPerRun}m manual`
          : runStats.totalRuns === 0 && !isEstimatedRuntime
            ? "no runs yet"
            : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    },
    { label: "Runs this week", value: String(runStats.runsThisWeek) },
    {
      label: "Time saved",
      value:
        runStats.totalMinutesSaved !== null
          ? formatMinutes(runStats.totalMinutesSaved)
          : "—",
      hint:
        runStats.totalRuns === 0
          ? "no runs yet"
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
      <div
        className="absolute top-7 right-7 lg:top-10 lg:right-10 z-20"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <PlaybookStatusControl
          slug={playbook.slug}
          enabled={playbook.enabled}
          isLocked={isLocked}
          runnable={playbook.runnable}
        />
      </div>

      <div className="relative z-10 p-7 lg:p-10">
        <div className="flex items-start gap-5 min-w-0 pr-24">
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

        <p className="mt-5 max-w-2xl text-muted-foreground text-lg leading-snug">
          {playbook.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <PlaybookConnectorLogos ids={playbook.connectorIds} />
          <p className="text-sm text-muted-foreground/80">{layerOutcome}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-display text-2xl tabular-nums leading-none text-foreground">
                  {item.value}
                </span>
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
