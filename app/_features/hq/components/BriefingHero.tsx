"use client";

import { Play, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { HqBriefingData } from "@/app/_features/plays/types";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";

function formatBriefingDateChip(date = new Date()) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${weekday} · ${monthDay}`;
}

function getGreetingName(firstName?: string, fullName?: string) {
  if (firstName?.trim()) return firstName.trim();
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0] ?? "there";
  return "there";
}

export function BriefingHero({ briefing }: { briefing: HqBriefingData }) {
  const { firstName, fullName } = useDashboardUser();
  const displayName = getGreetingName(firstName, fullName);
  const awaiting = briefing.playsAwaitingApproval;
  const ranToday = briefing.playsRanToday;

  const stats = [
    { label: "Cleared", value: briefing.clearedAmountLabel ?? "—" },
    { label: "Auto-sent", value: String(briefing.autoSentCount) },
    { label: "Need you", value: String(awaiting) },
  ] as const;

  const opportunityLine = briefing.primaryOpportunity?.claim
    ? briefing.primaryOpportunity.claim
    : "Salt is scanning your connected accounts for revenue opportunities.";

  return (
    <section className="surface-aurora animate-rise relative overflow-hidden rounded-[28px] text-white">
      <div className="relative z-10 grid items-end gap-8 p-7 lg:grid-cols-[1fr_auto] lg:p-10">
        <div className="max-w-2xl">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span
              className="chip border-white/20 bg-white/15 text-white/90 backdrop-blur"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
            >
              <span className="size-1.5 animate-pulse-glow rounded-full bg-white" />{" "}
              {formatBriefingDateChip()}
            </span>
            <span
              className="chip border-white/20 bg-white/15 text-white/90 backdrop-blur"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
            >
              <Sparkles className="size-3" /> Today&apos;s briefing
            </span>
          </div>

          <h1 className="font-display text-5xl font-medium leading-[0.98] tracking-[-0.02em] lg:text-[68px]">
            Good morning,
            <br />
            <span className="text-white/85">{displayName}.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-[1.55] text-white/85 sm:text-lg">
            Salt ran{" "}
            <span className="font-semibold text-white">{ranToday} plays</span> for you
            today.
            {awaiting > 0 ? (
              <>
                {" "}
                {awaiting} more {awaiting === 1 ? "is" : "are"} waiting on your approval — about
                90 seconds of work.
              </>
            ) : (
              <> {opportunityLine}</>
            )}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {awaiting > 0 ? (
              <a
                href="#play-queue"
                className="group flex h-11 items-center gap-2 rounded-full bg-white pl-4 pr-5 text-sm font-semibold text-neutral-900 hover-lift"
              >
                <Play className="size-4 fill-neutral-900" />
                Review {awaiting} {awaiting === 1 ? "play" : "plays"}
              </a>
            ) : (
              <Link
                href="?settings=connectors"
                className="group flex h-11 items-center gap-2 rounded-full bg-white pl-4 pr-5 text-sm font-semibold text-neutral-900 hover-lift"
              >
                Connect tools
              </Link>
            )}
            <button
              type="button"
              className="flex h-11 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-medium backdrop-blur transition hover:bg-white/15"
            >
              Listen — 45s <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 lg:w-[200px] lg:grid-cols-1">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="cursor-pointer rounded-2xl border border-white/20 bg-white/12 p-3.5 backdrop-blur transition hover:bg-white/18"
              style={{
                animation: "rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
                animationDelay: `${index * 80 + 100}ms`,
              }}
            >
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/70">
                {stat.label}
              </p>
              <p className="mt-1 whitespace-nowrap font-display text-3xl tabular-nums leading-none">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-10 size-72 animate-float rounded-full bg-white/20 blur-3xl" />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 size-64 animate-float rounded-full bg-flame/40 blur-3xl"
        style={{ animationDelay: "-3s" }}
      />
    </section>
  );
}
