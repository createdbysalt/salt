import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { PlaysFilterPopover } from "./PlaysFilterPopover";

import type { IconType } from "react-icons";
import {
  SiGmail, SiSlack, SiNotion, SiHubspot, SiLinear,
  SiZoom, SiGoogledrive, SiStripe, SiQuickbooks,
} from "react-icons/si";

const TOOL_ICONS: Record<string, { Icon: IconType; color: string }> = {
  Gmail: { Icon: SiGmail, color: "#EA4335" },
  Slack: { Icon: SiSlack, color: "#4A154B" },
  Notion: { Icon: SiNotion, color: "#000000" },
  HubSpot: { Icon: SiHubspot, color: "#FF7A59" },
  Linear: { Icon: SiLinear, color: "#5E6AD2" },
  Zoom: { Icon: SiZoom, color: "#0B5CFF" },
  "Google Drive": { Icon: SiGoogledrive, color: "#1FA463" },
  Stripe: { Icon: SiStripe, color: "#635BFF" },
  QuickBooks: { Icon: SiQuickbooks, color: "#2CA01C" },
};
import { PLAYERS, TONE_DOT, DEPARTMENTS, type Department, type Tone } from "@/app/_lib/demo/plays-demo-data";
import { PlaysSectionHeader } from "./PlaysSectionHeader";
import { cn } from "@repo/utils";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;


// Map tone → aurora glow color (uses existing brand tokens)
const TONE_GLOW: Record<Tone, string> = {
  flame: "bg-flame/15",
  sky: "bg-sky/15",
  violet: "bg-violet/15",
  ink: "bg-foreground/8",
  muted: "bg-muted-foreground/10",
};

const TONE_TEXT: Record<Tone, string> = {
  flame: "text-flame",
  sky: "text-sky",
  violet: "text-violet",
  ink: "text-foreground",
  muted: "text-muted-foreground",
};

const TONE_CHIP_BG: Record<Tone, string> = {
  flame: "bg-flame/10",
  sky: "bg-sky/12",
  violet: "bg-violet/12",
  ink: "bg-foreground/8",
  muted: "bg-muted",
};

const STATUS_LABELS: Record<Tone, string> = {
  flame: "Scanning",
  sky: "Operational",
  violet: "Drafting",
  ink: "Idle",
  muted: "Standby",
};

export function PlayersTab() {
  const mockContent = useMockContent();
  const [filter, setFilter] = useState<Department | "all">("all");
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    if (!mockContent) return [];
    const term = q.trim().toLowerCase();
    return PLAYERS.filter((p) => {
      if (filter !== "all" && p.department !== filter) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.role.toLowerCase().includes(term) ||
        p.job.toLowerCase().includes(term)
      );
    });
  }, [mockContent, filter, q]);
  const totalQueue = mockContent ? PLAYERS.reduce((s, p) => s + p.queue, 0) : 0;
  const totalToday = mockContent ? PLAYERS.reduce((s, p) => s + p.today, 0) : 0;
  const efficiency = mockContent
    ? Math.min(99, Math.round(80 + (totalToday / Math.max(1, totalQueue + totalToday)) * 20))
    : 0;

  if (!mockContent) {
    return (
      <MockContentEmptyState
        title="Players activate with your Plays"
        description="Specialized agents appear here once Salt has plays and connections to run."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-10"
    >
      <PlaysSectionHeader
        eyebrow="Tactical Roster"
        title="The Players"
        description="Your squad of autonomous agents. Each Player is specialized to observe, synthesize, and prepare your work before you arrive."
      />

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players…"
            className="w-full h-9 pl-10 pr-4 rounded-full bg-card border border-border/60 hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5 text-sm transition"
          />
        </div>
        <div className="ml-auto">
          <PlaysFilterPopover
            groupLabel="Department"
            options={DEPARTMENTS.map((d) => ({ id: d.id, label: d.label }))}
            value={filter === "all" ? null : filter}
            onChange={(id: string | null) => setFilter((id as Department) ?? "all")}
          />
        </div>
      </div>



      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visible.map((p, i) => {
          const Icon = p.icon;
          const total = p.queue + p.today || 1;
          const queuePct = Math.round((p.queue / total) * 100);
          const trend = p.today > 0 ? `+${Math.min(99, p.today * 10)}%` : "—";
          return (
            <motion.section
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: APPLE_EASE }}
              className="group relative glass-card rounded-[28px] p-6 overflow-hidden hover:shadow-[0_20px_40px_-12px_color-mix(in_oklab,var(--flame)_18%,transparent)] transition-all duration-500"
            >
              {/* Aurora glow */}
              <div className={cn(
                "absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-full transition-opacity opacity-60 group-hover:opacity-100",
                TONE_GLOW[p.tone]
              )} />

              <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", TONE_TEXT[p.tone], "opacity-70")}>
                      {DEPARTMENTS.find((d) => d.id === p.department)?.label}
                    </span>
                    <h3 className="font-display text-2xl leading-tight tracking-tight flex items-center gap-2">
                      <Icon className={cn("size-5 shrink-0", TONE_TEXT[p.tone])} strokeWidth={2} />
                      {p.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <div className={cn("h-8 w-8 rounded-xl grid place-items-center", TONE_CHIP_BG[p.tone])}>
                      <span className={cn(
                        "size-1.5 rounded-full animate-pulse-glow",
                        TONE_DOT[p.tone]
                      )} />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">
                      {STATUS_LABELS[p.tone]}
                    </span>
                  </div>
                </div>

                {/* Job description */}
                <p className="text-[13px] leading-relaxed text-foreground/75">
                  {p.job}
                </p>

                {/* Metric gauges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card/60 border border-border/40 rounded-2xl p-4">
                    <span className="block text-[9px] font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">Queue</span>
                    <div className="flex items-end justify-between gap-2">
                      <span className="font-display text-3xl leading-none tabular-nums">{p.queue}</span>
                      <Sparkbars accent={p.tone} pct={queuePct} />
                    </div>
                  </div>
                  <div className="bg-card/60 border border-border/40 rounded-2xl p-4">
                    <span className="block text-[9px] font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">Today</span>
                    <div className="flex items-end justify-between gap-2">
                      <span className="font-display text-3xl leading-none tabular-nums">{p.today}</span>
                      <span className={cn(
                        "text-[10px] font-semibold pb-1.5",
                        p.today > 0 ? TONE_TEXT[p.tone] : "text-muted-foreground/40"
                      )}>
                        {trend}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active tactics (playbooks) */}
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.16em] mb-2 block">
                    Playbooks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.playbooks.map((pb) => (
                      <span
                        key={pb}
                        className="chip normal-case tracking-normal text-[11px] font-medium"
                      >
                        {pb}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tools + last check */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <div className="flex items-center -space-x-1.5">
                    {p.tools.slice(0, 4).map((t) => {
                      const entry = TOOL_ICONS[t];
                      if (!entry) return null;
                      const { Icon, color } = entry;
                      return (
                        <span
                          key={t}
                          className="stacked-icon-badge size-7 hover:-translate-y-0.5 hover:z-10"
                          title={t}
                        >
                          <Icon className="size-3.5" style={{ color }} />
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground italic">
                    {p.today > 0 ? `Last check 2m ago` : `Ready`}
                  </span>
                </div>
              </div>
            </motion.section>
          );
        })}
      </div>
    </motion.div>
  );
}

function FleetStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-2xl px-5 py-4 flex items-baseline justify-between">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.16em]">{label}</span>
      <span className="font-display text-2xl tabular-nums leading-none">{value}</span>
    </div>
  );
}

function Sparkbars({ accent, pct }: { accent: Tone; pct: number }) {
  // Three bars; first bar height scales with pct
  const heights = [
    Math.max(6, Math.round((pct / 100) * 16)),
    Math.max(4, Math.round((pct / 100) * 10)),
    Math.max(8, 16 - Math.round((pct / 100) * 10)),
  ];
  const accentBar =
    accent === "flame" ? "bg-flame/80"
    : accent === "sky" ? "bg-sky/80"
    : accent === "violet" ? "bg-violet/80"
    : accent === "ink" ? "bg-foreground/80"
    : "bg-muted-foreground/60";
  return (
    <div className="flex gap-0.5 mb-1.5 items-end">
      <div className={cn("w-1 rounded-full", accentBar)} style={{ height: heights[0] }} />
      <div className="w-1 rounded-full bg-foreground/10" style={{ height: heights[1] }} />
      <div className="w-1 rounded-full bg-foreground/10" style={{ height: heights[2] }} />
    </div>
  );
}
