"use client";

import { WandSparkles } from "lucide-react";
import { cn } from "@repo/utils";
import type { PlayerWithVisual } from "../players/visual";
import { PLAYER_COLOR_SOFT, PLAYER_COLOR_TEXT } from "../players/visual";
import type { PlaybookBlueprintView } from "../types";
import type { PlayerContextRow } from "../players/queries";

const PLAYER_COLOR_VAR: Record<PlayerWithVisual["color"], string> = {
  flame: "var(--flame)",
  sky: "var(--sky)",
  violet: "var(--violet)",
  blush: "var(--blush)",
  teal: "var(--teal)",
  muted: "var(--muted-foreground)",
  ink: "var(--foreground)",
};

interface PlayerHeroProps {
  player: PlayerWithVisual;
  blueprints: PlaybookBlueprintView[];
  context: PlayerContextRow | null;
}

function openTeachInAskSalt(name: string) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: `Teach ${name} how I like things done — `,
        mode: "ask" as const,
      },
    }),
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
      {children}
    </span>
  );
}

export function PlayerHero({ player, blueprints, context }: PlayerHeroProps) {
  const PlayerIcon = player.icon;
  const accent = PLAYER_COLOR_VAR[player.color];

  const connectedApps = player.domainToolkits.length > 0
    ? player.domainToolkits.length
    : player.tools.filter((tool) => tool.toLowerCase() !== "salt").length;

  const profilePlaybooks = blueprints.filter((bp) => bp.kind === "profile").length;
  const actingPlaybooks = blueprints.filter((bp) => bp.kind === "acting").length;
  const hasContext = Boolean(
    context?.domain_knowledge?.trim() ||
      context?.tone_preferences?.trim() ||
      context?.workflow_preferences?.trim(),
  );

  const statItems = [
    { label: "Playbooks", value: String(blueprints.length) },
    { label: "Apps connected", value: String(connectedApps) },
    {
      label: player.allowedPlaybookKinds.includes("profile") ? "Capture playbooks" : "Acting playbooks",
      value: String(player.allowedPlaybookKinds.includes("profile") ? profilePlaybooks : actingPlaybooks),
    },
    {
      label: "Context taught",
      value: hasContext ? "Yes" : "—",
      hint: hasContext ? "saved on Overview" : "not configured",
    },
  ];

  const chips = [
    player.isSystem ? "System player" : "Custom player",
    player.canWriteMemory ? "Memory writes" : "Prepares work",
    player.alwaysRequiresApproval ? "Always approval" : "Trust-gated",
    player.allowedPlaybookKinds.includes("profile") ? "Capture playbooks" : "Acting playbooks",
  ];

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-border/50 ring-1 ring-foreground/10 animate-rise"
      style={{
        backgroundImage: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${accent} 12%, transparent) 0%, transparent 58%), linear-gradient(180deg, var(--card) 0%, var(--card) 100%)`,
      }}
    >
      <div className="relative z-10 p-7 lg:p-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div
              className={cn(
                "size-16 rounded-2xl grid place-items-center shrink-0",
                PLAYER_COLOR_SOFT[player.color],
              )}
            >
              <PlayerIcon className="size-7" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[10px] uppercase tracking-[0.16em] font-bold",
                  PLAYER_COLOR_TEXT[player.color],
                  "opacity-80",
                )}
              >
                {player.role} · Domain player
              </p>
              <h1 className="font-display text-4xl lg:text-[52px] leading-[0.95] tracking-tight mt-1 text-foreground">
                {player.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openTeachInAskSalt(player.name)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition hover:border-border hover:bg-background shrink-0"
          >
            <WandSparkles className="size-3.5" />
            Teach
          </button>
        </div>

        <p className="mt-5 max-w-2xl text-muted-foreground text-lg leading-snug">
          {player.description}
        </p>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
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
                  <span className="text-[11px] text-muted-foreground/70">{item.hint}</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
