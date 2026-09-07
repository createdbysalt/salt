"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Book, Clock3, Lock } from "lucide-react";
import { cn } from "@repo/utils";
import { estimatePlaybookRunDurationMs, formatDurationMs } from "../run-stats";
import { PlaybookConnectorLogos } from "./PlaybookConnectorLogos";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import {
  getSectionIcon,
  getSectionMeta,
  getSectionColorStyles,
  type PlaybookSection,
} from "./PlaybookSectionNav";
import {
  PlaybookStatusControl,
  PlaybookStepDots,
} from "./PlaybookCardShared";
import type {
  PlaybookOriginType,
  PlaybookStepSummary,
} from "../playbooks/queries-v2";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const APPROVAL_BADGE: Record<"auto" | "ask", string> = {
  ask: "Asks first",
  auto: "Autonomous",
};

const TRIGGER_LABELS: Record<
  "signal" | "schedule" | "manual" | "record_condition",
  string
> = {
  signal: "On signal",
  schedule: "Scheduled",
  manual: "Manual",
  record_condition: "On condition",
};

export interface PlaybookCardV2Props {
  slug: string;
  name: string;
  description: string;
  section: PlaybookSection;
  origin: PlaybookOriginType;
  steps: PlaybookStepSummary[];
  stepCount: number;
  connectorIds?: ConnectorCatalogId[];
  /** Minutes of manual work saved per run (definition value.estimate). */
  minutesSavedPerRun?: number | null;
  /** "ask" when the output or any step requires approval. */
  approvalMode?: "auto" | "ask";
  triggerType?: "signal" | "schedule" | "manual" | "record_condition";
  enabled?: boolean;
  runnable?: boolean;
  needsApp?: boolean;
  /**
   * Allowlisted tools currently hard-denied at the execution gate
   * (drift-disabled / rejected). Non-empty while enabled = the playbook
   * cannot run; the card says so instead of letting a run fail later.
   */
  disabledTools?: string[];
  onClick?: () => void;
  index?: number;
}

export function PlaybookCardV2({
  slug,
  name,
  description,
  section,
  origin,
  steps = [],
  stepCount,
  connectorIds = [],
  minutesSavedPerRun = null,
  approvalMode = "ask",
  triggerType = "manual",
  enabled = true,
  runnable = true,
  needsApp = false,
  disabledTools = [],
  onClick,
  index = 0,
}: PlaybookCardV2Props) {
  const saltRuntimeMs = estimatePlaybookRunDurationMs(steps);
  const sectionMeta =
    section !== "all"
      ? getSectionMeta(section as Exclude<PlaybookSection, "all">)
      : null;
  const sectionStyles =
    section !== "all"
      ? getSectionColorStyles(section as Exclude<PlaybookSection, "all">)
      : null;
  const SectionIcon =
    section !== "all"
      ? getSectionIcon(section as Exclude<PlaybookSection, "all">)
      : Book;
  const isLocked = origin === "salt_system";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: APPLE_EASE }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative rounded-[24px] p-5 pt-6 flex flex-col group overflow-hidden cursor-pointer h-full",
        "border border-border/50 transition-all duration-300",
        sectionStyles?.gradient ?? "bg-card",
        "hover:border-border hover:shadow-[0_20px_40px_-24px_color-mix(in_oklab,var(--foreground)_18%,transparent)]",
        sectionStyles?.ring ?? "ring-1 ring-foreground/8 hover:ring-foreground/14",
        !enabled && !isLocked && "opacity-80"
      )}
    >
      <div
        className="absolute top-4 right-4 z-20"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <PlaybookStatusControl
          slug={slug}
          enabled={enabled}
          isLocked={isLocked}
          runnable={runnable}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start gap-3.5 pr-16">
          <motion.span
            whileHover={{ rotate: -6, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn(
              "size-12 rounded-2xl grid place-items-center shrink-0 relative",
              "shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
              sectionStyles?.bg ?? "bg-muted"
            )}
          >
            <SectionIcon
              className={cn("size-5", sectionStyles?.text ?? "text-foreground")}
              strokeWidth={2}
            />
            {isLocked ? (
              <span
                className="absolute -bottom-1 -right-1 size-4 rounded-full bg-background border border-border grid place-items-center"
                title="System playbook"
              >
                <Lock className="size-2 text-muted-foreground" strokeWidth={2.25} />
              </span>
            ) : null}
          </motion.span>

          <div className="flex-1 min-w-0 pt-0.5">
            <p
              className={cn(
                "text-[10px] uppercase tracking-[0.14em] font-bold",
                sectionStyles?.text ?? "text-muted-foreground"
              )}
            >
              {sectionMeta ? sectionMeta.label : "Playbook"}
            </p>
            <h3 className="font-display text-[17px] leading-snug tracking-tight mt-0.5 text-foreground">
              {name}
            </h3>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed line-clamp-2 flex-1">
          {description}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <PlaybookStepDots
            stepCount={stepCount}
            dotClass={sectionStyles?.dot}
          />

          {saltRuntimeMs !== null ||
          (minutesSavedPerRun !== null && minutesSavedPerRun > 0) ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span
                className="inline-flex items-baseline gap-1 text-[10px] font-semibold tabular-nums"
                title="Estimated Salt runtime vs manual time, per run"
              >
                <Clock3
                  className="size-2.5 self-center text-muted-foreground"
                  strokeWidth={2.5}
                />
                {saltRuntimeMs !== null ? (
                  <span className="text-foreground">
                    ~{formatDurationMs(saltRuntimeMs)}
                  </span>
                ) : null}
                {minutesSavedPerRun !== null && minutesSavedPerRun > 0 ? (
                  <span className="text-muted-foreground/70 line-through">
                    {minutesSavedPerRun}m
                  </span>
                ) : null}
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {enabled && disabledTools.length > 0 ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-700 dark:text-red-300"
              title={`Pending security re-review: ${disabledTools.join(", ")}`}
            >
              Can&apos;t run — tool under review
            </span>
          ) : null}
          {needsApp ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-800 dark:text-amber-200">
              Needs an app
            </span>
          ) : null}
          {[APPROVAL_BADGE[approvalMode], TRIGGER_LABELS[triggerType]].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground/70"
            >
              <span className="size-1 rounded-full bg-current opacity-80" />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between gap-3">
          {connectorIds.length > 0 ? (
            <PlaybookConnectorLogos ids={connectorIds} />
          ) : null}

          <span className="inline-flex shrink-0 items-center gap-1 ml-auto text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            View
            <ArrowUpRight
              className="size-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              strokeWidth={2.25}
            />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
