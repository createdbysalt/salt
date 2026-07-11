"use client";

import Link from "next/link";
import { BookOpen, Database, Shield, Sparkles, Zap } from "lucide-react";
import { ConnectorIconStack } from "@/app/_features/connectors/components/ConnectorIconStack";
import type { PlayerWithVisual } from "../players/visual";
import type { PlaybookBlueprintView } from "../types";

type PlayerSidebarProps = {
  player: PlayerWithVisual;
  blueprints: PlaybookBlueprintView[];
};

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[24px] p-5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function TriggerItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground/80">
      <Zap className="size-4 shrink-0 text-foreground mt-0.5" />
      {text}
    </li>
  );
}

export function PlayerSidebar({ player, blueprints }: PlayerSidebarProps) {
  const profileCount = blueprints.filter((bp) => bp.kind === "profile").length;
  const actingCount = blueprints.filter((bp) => bp.kind === "acting").length;

  const whenItems = [
    player.slug === "keeper"
      ? "Capture signals arrive from connected apps and Ask Salt"
      : "Plays queue when this player prepares work for your review",
    player.canWriteMemory
      ? "Writes to Memory when confidence passes your threshold"
      : "Prepares drafts and actions — never writes Memory directly",
    player.alwaysRequiresApproval
      ? "Every outbound action waits for your approval"
      : "Low-confidence suggestions land in Plays for review",
  ];

  const usesItems = [
    `${blueprints.length} installed playbook${blueprints.length === 1 ? "" : "s"}`,
    profileCount > 0 ? `${profileCount} capture playbook${profileCount === 1 ? "" : "s"}` : null,
    actingCount > 0 ? `${actingCount} acting playbook${actingCount === 1 ? "" : "s"}` : null,
    player.domainToolkits.length > 0
      ? `Domain toolkits: ${player.domainToolkits.join(", ")}`
      : "Uses workspace context and Me preferences",
    "Teach context on Overview shapes every run",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <SidebarCard title="When they run">
        <ul className="space-y-3">
          {whenItems.map((text) => (
            <TriggerItem key={text} text={text} />
          ))}
        </ul>
      </SidebarCard>

      <SidebarCard title="What they use">
        <ul className="space-y-3">
          {usesItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              {item}
            </li>
          ))}
        </ul>

        {player.domainToolkits.length > 0 ? (
          <div className="border-t border-border/50 pt-3 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
              Connected apps
            </p>
            <ConnectorIconStack toolkits={player.domainToolkits} max={6} size="md" />
          </div>
        ) : player.tools.length > 0 ? (
          <div className="border-t border-border/50 pt-3 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
              Connected apps
            </p>
            <div className="flex flex-wrap gap-2">
              {player.tools
                .filter((tool) => tool.toLowerCase() !== "salt")
                .map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                  >
                    {tool}
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-border/50 pt-3 flex flex-wrap gap-2">
          {player.canWriteMemory ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium">
              <Database className="size-3.5 text-violet" />
              Memory writes
            </span>
          ) : null}
          {player.isSystem ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium">
              <Shield className="size-3.5 text-foreground" />
              System
            </span>
          ) : null}
          {!player.alwaysRequiresApproval ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5 text-sky" />
              Trust-gated
            </span>
          ) : null}
        </div>
      </SidebarCard>

      <SidebarCard title="Playbooks">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {player.name} owns {blueprints.length} playbook{blueprints.length === 1 ? "" : "s"} in
          your workspace.
        </p>
        <Link
          href={`/plays?tab=customize&customize=playbooks`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
        >
          <BookOpen className="size-3.5" />
          Browse all playbooks
        </Link>
      </SidebarCard>
    </div>
  );
}
