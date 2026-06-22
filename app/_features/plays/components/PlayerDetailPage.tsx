"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Brain, ShieldCheck } from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiGmail,
  SiSlack,
  SiNotion,
  SiHubspot,
  SiLinear,
  SiZoom,
  SiGoogledrive,
  SiStripe,
  SiQuickbooks,
} from "react-icons/si";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { PLAYERS, playerById, type Player, type PlayerId } from "@/app/_lib/demo/plays-demo-data";
import { PlayerHero } from "./PlayerHero";

const SALT_ICON_SRC = "/landing/salt-icon.svg";

const TOOL_ICONS: Record<string, { Icon?: IconType; img?: string; color: string }> = {
  Gmail: { Icon: SiGmail, color: "#EA4335" },
  Slack: { Icon: SiSlack, color: "#4A154B" },
  Notion: { Icon: SiNotion, color: "#000000" },
  HubSpot: { Icon: SiHubspot, color: "#FF7A59" },
  Linear: { Icon: SiLinear, color: "#5E6AD2" },
  Zoom: { Icon: SiZoom, color: "#0B5CFF" },
  "Google Drive": { Icon: SiGoogledrive, color: "#1FA463" },
  Stripe: { Icon: SiStripe, color: "#635BFF" },
  QuickBooks: { Icon: SiQuickbooks, color: "#2CA01C" },
  Salt: { img: SALT_ICON_SRC, color: "#000000" },
};

const PLAYBOOK_HREF: Record<string, string> = {
  "People Records": "/plays/playbooks/people-profile",
};

const TAB_TRIGGER_CLASS =
  "rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background px-4";

type PlayerDetailPageProps = {
  player: Player;
};

export function PlayerDetailPage({ player }: PlayerDetailPageProps) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
        <Link
          href="/plays?tab=customize&customize=players"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Players
        </Link>

        <PlayerHero player={player} />

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className="bg-card border border-border/60 rounded-full p-1 h-auto flex-wrap">
                <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="playbooks" className={TAB_TRIGGER_CLASS}>
                  Playbooks
                </TabsTrigger>
              </TabsList>

              <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
                <TabsContent value="overview" className="m-0 space-y-6">
                  <section className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Job
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{player.job}</p>
                  </section>

                  <section className="space-y-3 pt-2 border-t border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Approval policy
                    </p>
                    <div className="flex items-start gap-2 text-sm text-foreground/80">
                      <ShieldCheck className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                      {player.approval}
                    </div>
                  </section>

                  <section className="space-y-3 pt-2 border-t border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Memory
                    </p>
                    <div className="flex items-start gap-2 text-sm text-foreground/80">
                      <Brain className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                      {player.memory}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="playbooks" className="m-0 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Owned playbooks
                    </p>
                    <h2 className="font-display text-xl tracking-tight mt-1">
                      What this player runs
                    </h2>
                  </div>

                  <ul className="space-y-3">
                    {player.playbooks.map((playbookName) => {
                      const href =
                        PLAYBOOK_HREF[playbookName] ??
                        "/plays?tab=customize&customize=playbooks";
                      const isProfilePlaybook = Boolean(PLAYBOOK_HREF[playbookName]);

                      return (
                        <li key={playbookName}>
                          <Link
                            href={href}
                            className="group flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/60 px-4 py-4 hover:border-border transition"
                          >
                            <div>
                              <p className="font-semibold">{playbookName}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {isProfilePlaybook
                                  ? "Profile playbook · view fill rules"
                                  : "Acting playbook · adopt from library"}
                              </p>
                            </div>
                            <ArrowUpRight className="size-4 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <aside className="space-y-6">
            <SidebarCard title="Tools">
              <div className="flex flex-wrap gap-2">
                {player.tools.map((tool) => {
                  const meta = TOOL_ICONS[tool];
                  const ToolIcon = meta?.Icon;
                  return (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                    >
                      {meta?.img ? (
                        <img src={meta.img} alt={tool} className="size-3.5" />
                      ) : ToolIcon ? (
                        <ToolIcon className="size-3.5" style={{ color: meta.color }} />
                      ) : null}
                      {tool}
                    </span>
                  );
                })}
              </div>
            </SidebarCard>

            <SidebarCard title="Playbooks">
              <div className="flex flex-wrap gap-1.5">
                {player.playbooks.map((pb) => (
                  <span key={pb} className="chip normal-case tracking-normal text-[11px] font-medium">
                    {pb}
                  </span>
                ))}
              </div>
            </SidebarCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function resolveDemoPlayer(slug: string): Player | null {
  const allowed = PLAYERS.map((p) => p.id);
  if (!allowed.includes(slug as PlayerId)) return null;
  return playerById(slug as PlayerId);
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[24px] p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}
