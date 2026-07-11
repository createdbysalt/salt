"use client";

import { WandSparkles } from "lucide-react";
import type { PlaybookBlueprintView } from "@/app/_features/plays/types";
import type { ProfileProvenanceStats } from "@/app/_features/plays/playbooks/records-engine/types";
import { playbookHeroEyebrow } from "@/app/_features/plays/utils/playbook-display";
import { playerById, TONE_SOFT, type Tone } from "@/app/_lib/demo/plays-demo-data";
import { cn } from "@repo/utils";

type ProfilePlaybookHeroProps = {
  blueprint: PlaybookBlueprintView;
  stats: ProfileProvenanceStats;
};

const TONE_VAR: Record<Tone, string> = {
  ink: "var(--foreground)",
  flame: "var(--flame)",
  sky: "var(--sky)",
  violet: "var(--violet)",
  muted: "var(--muted-foreground)",
};

// A "run" for a Profile playbook = one record update you'd otherwise do by hand
// in a CRM (HoneyBook, HubSpot, etc.): notice the signal, open the record, type,
// verify, save. Range is grounded in published CRM data-entry benchmarks:
//   - Editing one field / quick contact update: ~2-3 min
//   - Building a whole profile (find, classify, link org, log context): ~10-15 min
// Sources: HubSpot single-contact entry 3-5 min; "post-call cleanup" ~15 min;
// "contact hunting" ~10 min (klu.so, coffee.ai, keepsync.io, 2025-2026).
// Time Salt takes to run a fill (automated classify + apply) vs. doing the same
// record update by hand in a CRM. Manual range is grounded in published data-entry
// benchmarks: ~2-3 min for one field, ~10-15 min for a whole profile
// (HubSpot single-contact entry 3-5 min; "post-call cleanup" ~15 min; klu.so,
// coffee.ai, keepsync.io, 2025-2026).
const SALT_RUNTIME = "~10s";
const MANUAL_TIME_RANGE = "2–15m";
// Minutes saved per completed run. We only track a count of runs (not each run's
// duration), so the displayed "Time saved / run" is the average across all runs
// so far = (runs × this estimate) ÷ runs. Conservative mid-low of the manual range.
const AVG_MINUTES_SAVED_PER_RUN = 5;

function openEditInAskSalt(name: string) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: `Edit the ${name} playbook — `,
        mode: "ask" as const,
      },
    }),
  );
}

export function ProfilePlaybookHero({ blueprint, stats }: ProfilePlaybookHeroProps) {
  const owner = playerById(blueprint.playerSlug);
  const OwnerIcon = owner.icon;
  const accent = TONE_VAR[owner.tone];

  const connectedApps = owner.tools.filter(
    (tool) => tool.toLowerCase() !== "salt",
  );
  const runsSoFar = stats.applied;
  const totalMinutesSaved = runsSoFar * AVG_MINUTES_SAVED_PER_RUN;
  const avgSavedPerRun =
    runsSoFar > 0 ? `~${Math.round(totalMinutesSaved / runsSoFar)}m` : "—";

  const statItems = [
    { label: "Apps connected", value: String(connectedApps.length) },
    {
      label: "Runtime",
      value: SALT_RUNTIME,
      hint: `vs ${MANUAL_TIME_RANGE} manual`,
    },
    { label: "Runs this week", value: String(stats.appliedThisWeek ?? 0) },
    {
      label: "Time saved / run",
      value: avgSavedPerRun,
      hint: runsSoFar > 0 ? "avg over all runs" : "no runs yet",
    },
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
                TONE_SOFT[owner.tone],
              )}
            >
              <OwnerIcon className="size-7" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-muted-foreground">
                {playbookHeroEyebrow(blueprint.kind, blueprint.playerSlug)}
              </p>
              <h1 className="font-display text-4xl lg:text-[52px] leading-[0.95] tracking-tight mt-1 text-foreground">
                {blueprint.name}
              </h1>
            </div>
          </div>

{blueprint.playerSlug !== "keeper" && (
            <button
              type="button"
              onClick={() => openEditInAskSalt(blueprint.name)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition hover:border-border hover:bg-background shrink-0"
            >
              <WandSparkles className="size-3.5" />
              Edit
            </button>
          )}
        </div>

        <p className="mt-5 max-w-2xl text-muted-foreground text-lg leading-snug">
          {blueprint.description}
        </p>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <Chip>Auto-runs</Chip>
          <Chip>Updates Memory only</Chip>
          <Chip>Low-confidence → Plays queue</Chip>
          <Chip>Owned by {owner.name}</Chip>
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
      {children}
    </span>
  );
}
