"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Book, Lock } from "lucide-react";
import { cn } from "@repo/utils";
import {
  getSectionIcon,
  getSectionMeta,
  getSectionColorStyles,
  type PlaybookSection,
} from "./PlaybookSectionNav";
import {
  getPlaybookLayerOutcome,
  PlaybookStatusControl,
  PlaybookStepDots,
} from "./PlaybookCardShared";
import type {
  PlaybookOriginType,
  PlaybookStepSummary,
} from "../playbooks/queries-v2";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export interface PlaybookCardV2Props {
  slug: string;
  name: string;
  description: string;
  section: PlaybookSection;
  layer: "learn" | "act";
  voice?: string | null;
  origin: PlaybookOriginType;
  steps: PlaybookStepSummary[];
  stepCount: number;
  enabled?: boolean;
  runnable?: boolean;
  onClick?: () => void;
  index?: number;
}

export function PlaybookCardV2({
  slug,
  name,
  description,
  section,
  layer,
  voice,
  origin,
  stepCount,
  enabled = true,
  runnable = true,
  onClick,
  index = 0,
}: PlaybookCardV2Props) {
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
  const footerDetail = getPlaybookLayerOutcome(layer, voice);

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
        "relative rounded-[24px] p-5 flex flex-col group overflow-hidden cursor-pointer h-full",
        "border border-border/50 bg-card transition-all duration-300",
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
          <span
            className={cn(
              "size-11 rounded-xl grid place-items-center shrink-0 relative",
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
          </span>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-[10px] uppercase tracking-[0.14em] font-bold",
                sectionStyles?.text ?? "text-muted-foreground"
              )}
            >
              {sectionMeta ? `${sectionMeta.label} Playbook` : "Playbook"}
            </p>
            <h3 className="font-display text-[17px] leading-snug tracking-tight mt-0.5 text-foreground">
              {name}
            </h3>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed line-clamp-2 flex-1">
          {description}
        </p>

        <PlaybookStepDots
          stepCount={stepCount}
          dotClass={sectionStyles?.dot}
          className="mt-4"
        />

        <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] text-muted-foreground/80">
            {footerDetail}
          </p>

          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
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
