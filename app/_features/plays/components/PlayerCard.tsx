"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@repo/utils";
import { ConnectorIconStack } from "@/app/_features/connectors/components/ConnectorIconStack";
import type { PlayerWithVisual } from "../players/visual";
import {
  PLAYER_COLOR_GRADIENT,
  PLAYER_COLOR_RING,
  PLAYER_COLOR_SOFT,
  PLAYER_COLOR_TEXT,
} from "../players/visual";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface PlayerCardProps {
  player: PlayerWithVisual;
  playbookCount: number;
  index?: number;
  unseenCount?: number;
}

export function PlayerCard({ player, playbookCount, index = 0, unseenCount }: PlayerCardProps) {
  const router = useRouter();
  const PlayerIcon = player.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: APPLE_EASE }}
      whileHover={{ y: -4 }}
      onClick={() => router.push(`/plays/players/${player.slug}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/plays/players/${player.slug}`);
        }
      }}
      role="link"
      tabIndex={0}
      className={cn(
        "col-span-12 sm:col-span-6 lg:col-span-4 relative rounded-[28px] p-5 pt-6 flex flex-col group overflow-hidden cursor-pointer",
        "border border-border/50 ring-1 transition-all duration-300",
        "shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] hover:shadow-[0_24px_50px_-24px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
        PLAYER_COLOR_GRADIENT[player.color],
        PLAYER_COLOR_RING[player.color],
      )}
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: avatar + name */}
        <div className="flex items-start gap-3">
          <motion.span
            whileHover={{ rotate: -6, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn(
              "size-14 rounded-2xl grid place-items-center shrink-0 shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
              PLAYER_COLOR_SOFT[player.color],
            )}
          >
            <PlayerIcon className="size-6" strokeWidth={2} />
          </motion.span>
          <div className="flex-1 min-w-0 pt-1">
            <p
              className={cn(
                "text-[10px] uppercase tracking-[0.16em] font-bold opacity-80",
                PLAYER_COLOR_TEXT[player.color],
              )}
            >
              {player.role}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="font-display text-[19px] leading-tight tracking-tight">
                {player.name}
              </h3>
              {unseenCount !== undefined && unseenCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground min-w-[20px]">
                  {unseenCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[12.5px] text-foreground/65 mt-3 leading-relaxed line-clamp-2">
          {player.description}
        </p>

        {/* Capabilities badges */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {player.canWriteMemory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet/15 text-violet">
              <span className="size-1 rounded-full bg-current opacity-80" />
              Memory writes
            </span>
          )}
          {player.alwaysRequiresApproval ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-flame/15 text-flame">
              <span className="size-1 rounded-full bg-current opacity-80" />
              Always approval
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky/15 text-sky">
              <span className="size-1 rounded-full bg-current opacity-80" />
              Trust-gated
            </span>
          )}
          {player.isSystem && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-foreground/8 text-foreground">
              <span className="size-1 rounded-full bg-current opacity-80" />
              System
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
            <BookOpen className="size-3" strokeWidth={2} />
            {playbookCount} playbook{playbookCount !== 1 ? "s" : ""}
          </span>
          {player.domainToolkits.length > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <ConnectorIconStack toolkits={player.domainToolkits} max={4} size="sm" />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground tabular-nums inline-flex items-center gap-1.5">
            {player.slug === "keeper" ? (
              <>
                <Sparkles className="size-3 text-muted-foreground" strokeWidth={2} />
                Memory guardian
              </>
            ) : (
              <>
                <Shield className="size-3 text-muted-foreground" strokeWidth={2} />
                {player.approvalBehavior}
              </>
            )}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-semibold",
              PLAYER_COLOR_TEXT[player.color],
            )}
          >
            Configure
            <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
