"use client";

import Link from "next/link";
import { DEPARTMENTS, TONE_DOT, type Player } from "@/app/_lib/demo/plays-demo-data";
import { cn } from "@repo/utils";

type PlayerHeroProps = {
  player: Player;
};

export function PlayerHero({ player }: PlayerHeroProps) {
  const Icon = player.icon;
  const isKeeper = player.id === "keeper";
  const efficiency = Math.min(
    99,
    Math.round(80 + (player.today / Math.max(1, player.queue + player.today)) * 20),
  );

  const statItems = isKeeper
    ? [
        { label: "Fields kept", value: "—" },
        { label: "Auto-applied", value: "—" },
        { label: "Playbooks", value: String(player.playbooks.length) },
        { label: "Tools", value: String(player.tools.length) },
      ]
    : [
        { label: "Queue", value: String(player.queue) },
        { label: "Today", value: String(player.today) },
        { label: "Efficiency", value: `${efficiency}%` },
        { label: "Playbooks", value: String(player.playbooks.length) },
      ];

  return (
    <section className="relative overflow-hidden rounded-[28px] surface-aurora text-white animate-rise">
      <div className="relative z-10 p-7 lg:p-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
              {DEPARTMENTS.find((d) => d.id === player.department)?.label}
            </span>
            <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20 inline-flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", TONE_DOT[player.tone])} />
              {isKeeper ? "Record upkeep" : "Operational"}
            </span>
            <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
              {player.role}
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center shrink-0">
              <Icon className="size-7 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-4xl lg:text-[52px] leading-[0.95] tracking-tight">
                {player.name}
              </h1>
            </div>
          </div>

          <p className="mt-5 text-white/85 text-lg leading-snug">{player.description}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                {item.label}
              </p>
              <p className="font-display text-2xl tabular-nums leading-none mt-1.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
