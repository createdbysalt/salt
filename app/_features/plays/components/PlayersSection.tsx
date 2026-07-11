"use client";

import { motion } from "framer-motion";
import { getSystemPlayersWithVisual } from "../players/visual";
import { PlayerCard } from "./PlayerCard";
import type { PlaybookBlueprintView } from "../types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface PlayersSectionProps {
  blueprints: PlaybookBlueprintView[];
  keeperUnseenCount?: number;
}

export function PlayersSection({ blueprints, keeperUnseenCount }: PlayersSectionProps) {
  const players = getSystemPlayersWithVisual();

  const playbookCountByPlayer = blueprints.reduce(
    (acc, bp) => {
      const slug = bp.playerSlug;
      acc[slug] = (acc[slug] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-6"
    >
      <div className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-[minmax(0,auto)]">
        {players.map((player, i) => (
          <PlayerCard
            key={player.slug}
            player={player}
            playbookCount={playbookCountByPlayer[player.slug] ?? 0}
            index={i}
            unseenCount={player.slug === "keeper" ? keeperUnseenCount : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
}
