"use client";

import { MapPin, Clock, Target } from "lucide-react";
import {
  memoryHeroInnerClass,
  memoryHeroSectionClass,
  memoryHeroSummaryClass,
  memoryHeroTitleClass,
} from "@/app/_features/memory/utils/memory-layout";
import type { OperatorIdentity } from "../types";

export function MeHero({
  identity,
  goalCount,
  factCount,
  proposedCount,
}: {
  identity: OperatorIdentity;
  goalCount: number;
  factCount: number;
  proposedCount: number;
}) {
  const stats = [
    { label: "Active goals", value: String(goalCount) },
    { label: "Memory facts", value: String(factCount) },
    { label: "To review", value: String(proposedCount) },
  ];

  return (
    <section className={memoryHeroSectionClass}>
      <div className={memoryHeroInnerClass}>
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-start">
          <div className="max-w-2xl min-w-0">
            <div className="flex items-center gap-2 mb-4 sm:mb-5 flex-wrap">
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <span className="size-1.5 rounded-full bg-flame animate-pulse-glow" />
                You
              </span>
              {identity.location && (
                <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                  <MapPin className="size-3" strokeWidth={2} />
                  {identity.location}
                </span>
              )}
              {identity.timezone && (
                <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                  <Clock className="size-3" strokeWidth={2} />
                  {identity.timezone}
                </span>
              )}
            </div>

            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="size-14 sm:size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-lg sm:text-xl font-semibold text-white shrink-0">
                {identity.initials}
              </div>
              <div className="min-w-0">
                <h1 className={memoryHeroTitleClass}>{identity.name}</h1>
                {identity.roleTitle && (
                  <p className="mt-1.5 sm:mt-2 text-white/80 text-sm sm:text-base">{identity.roleTitle}</p>
                )}
              </div>
            </div>

            {identity.tagline && <p className={memoryHeroSummaryClass}>{identity.tagline}</p>}

            {identity.currentFocus && (
              <div className="mt-5 flex items-start gap-2 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3.5">
                <Target className="size-4 text-white/80 mt-0.5 shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Current focus</p>
                  <p className="mt-0.5 text-sm text-white/90 leading-snug">{identity.currentFocus}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 lg:w-[200px]">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/12 backdrop-blur border border-white/20 p-3.5"
                style={{ animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${i * 80 + 100}ms` }}
              >
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">{s.label}</p>
                <p className="mt-1 font-display text-2xl leading-none tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -top-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
    </section>
  );
}
