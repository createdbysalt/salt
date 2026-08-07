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
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type { PlaybookSection } from "../playbooks/schema/v2/types";
import type { ProfileProvenanceStats } from "../playbooks/records-engine/types";

const SALT_RUNTIME = "~10s";
const MANUAL_TIME_RANGE = "2–15m";
const AVG_MINUTES_SAVED_PER_RUN = 5;

interface PlaybookHeroV2Props {
  playbook: PlaybookListItem;
  connectedAppCount?: number;
  stats?: ProfileProvenanceStats;
}

export function PlaybookHeroV2({
  playbook,
  connectedAppCount = 0,
  stats = { applied: 0, pending: 0, appliedThisWeek: 0 },
}: PlaybookHeroV2Props) {
  const sectionMeta = getSectionMeta(playbook.section as PlaybookSection);
  const sectionStyles = getSectionColorStyles(playbook.section as PlaybookSection);
  const SectionIcon = getSectionIcon(playbook.section as PlaybookSection);
  const isLocked = playbook.origin === "salt_system";
  const layerOutcome = getPlaybookLayerOutcome(playbook.layer, playbook.voice);

  const runsSoFar = stats.applied;
  const totalMinutesSaved = runsSoFar * AVG_MINUTES_SAVED_PER_RUN;
  const avgSavedPerRun =
    runsSoFar > 0 ? `~${Math.round(totalMinutesSaved / runsSoFar)}m` : "—";

  const statItems = [
    { label: "Apps connected", value: String(connectedAppCount) },
    {
      label: "Runtime",
      value: SALT_RUNTIME,
      hint: `vs ${MANUAL_TIME_RANGE} manual`,
    },
    { label: "Runs this week", value: String(stats.appliedThisWeek ?? 0) },
    {
      label: "Time saved / run",
      value: avgSavedPerRun,
      hint: runsSoFar > 0 ? "avg over all runs" : "no runs yet",
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

        <p className="mt-3 text-sm text-muted-foreground/80">{layerOutcome}</p>

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
