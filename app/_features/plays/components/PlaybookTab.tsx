import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowUpRight, Sparkles, Clock3 } from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiGmail, SiSlack, SiNotion, SiHubspot, SiLinear,
  SiZoom, SiGoogledrive, SiStripe, SiQuickbooks, SiFigma,
} from "react-icons/si";
import { PLAYBOOKS, PLAYERS, playerById, TONE_SOFT, TONE_DOT, type PlayerId, type Tone } from "@/app/_lib/demo/plays-demo-data";
const SALT_ICON_SRC = "/landing/salt-icon.svg";
import { PlaysFilterPopover } from "./PlaysFilterPopover";
import { cn } from "@repo/utils";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";



const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const TAG_STYLES: Record<string, string> = {
  Auto: "bg-sky/15 text-sky",
  Manual: "bg-muted text-foreground/70",
  "Needs approval": "bg-flame/15 text-flame",
  "Auto-runs": "bg-violet/15 text-violet",
};

// Per-tone gradient surfaces for card backgrounds — gives each playbook
// a distinct, owner-coded "personality" instead of identical glass cards.
const TONE_GRADIENT: Record<Tone, string> = {
  flame:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--flame)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  sky:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--sky)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  violet:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--violet)_18%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  ink:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--foreground)_10%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  muted:
    "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--muted-foreground)_12%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
};

const TONE_RING: Record<Tone, string> = {
  flame: "ring-flame/25 hover:ring-flame/50",
  sky: "ring-sky/25 hover:ring-sky/50",
  violet: "ring-violet/25 hover:ring-violet/50",
  ink: "ring-foreground/15 hover:ring-foreground/30",
  muted: "ring-border hover:ring-muted-foreground/40",
};

const TONE_TEXT: Record<Tone, string> = {
  flame: "text-flame",
  sky: "text-sky",
  violet: "text-violet",
  ink: "text-foreground",
  muted: "text-muted-foreground",
};
const APP_META: Record<string, { Icon?: IconType; img?: string; color: string; label: string }> = {
  Gmail: { Icon: SiGmail, color: "#EA4335", label: "Gmail" },
  Slack: { Icon: SiSlack, color: "#4A154B", label: "Slack" },
  Notion: { Icon: SiNotion, color: "#000000", label: "Notion" },
  Linear: { Icon: SiLinear, color: "#5E6AD2", label: "Linear" },
  Zoom: { Icon: SiZoom, color: "#0B5CFF", label: "Zoom" },
  "Google Drive": { Icon: SiGoogledrive, color: "#1FA463", label: "Google Drive" },
  HubSpot: { Icon: SiHubspot, color: "#FF7A59", label: "HubSpot" },
  Stripe: { Icon: SiStripe, color: "#635BFF", label: "Stripe" },
  QuickBooks: { Icon: SiQuickbooks, color: "#2CA01C", label: "QuickBooks" },
  Figma: { Icon: SiFigma, color: "#F24E1E", label: "Figma" },
  Salt: { img: SALT_ICON_SRC, color: "#000000", label: "Salt" },
};




export function PlaybookTab() {
  const mockContent = useMockContent();
  const [q, setQ] = useState("");
  const [playerFilter, setPlayerFilter] = useState<PlayerId | "all">("all");

  const filtered = useMemo(() => {
    if (!mockContent) return [];
    const term = q.trim().toLowerCase();
    return PLAYBOOKS.filter((p) => {
      if (playerFilter !== "all" && p.ownerId !== playerFilter) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.purpose.toLowerCase().includes(term) ||
        playerById(p.ownerId).name.toLowerCase().includes(term)
      );
    });
  }, [mockContent, q, playerFilter]);

  if (!mockContent) {
    return (
      <MockContentEmptyState
        title="No playbooks yet"
        description="Saved automations and approval flows appear here once you configure Plays."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-6"
    >
      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search playbook or player…"
            className="w-full h-9 pl-10 pr-4 rounded-full bg-card border border-border/60 hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5 text-sm transition"
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {filtered.length} {filtered.length === 1 ? "playbook" : "playbooks"}
        </span>
        <div className="ml-auto">
          <PlaysFilterPopover
            groupLabel="Player"
            options={PLAYERS.map((p) => ({
              id: p.id,
              label: p.name,
              monogram: p.monogram,
              swatchClass: TONE_SOFT[p.tone],
            }))}
            value={playerFilter === "all" ? null : playerFilter}
            onChange={(id: string | null) => setPlayerFilter((id as PlayerId) ?? "all")}
          />
        </div>
      </div>


      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-[minmax(0,auto)]">
        {filtered.map((pb, i) => {
          const owner = playerById(pb.ownerId);
          const OwnerIcon = owner.icon;
          const isHot = pb.usedThisWeek >= 5;
          return (
            <motion.article
              key={pb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.03, ease: APPLE_EASE }}
              whileHover={{ y: -4 }}
              className={cn(
                "col-span-12 sm:col-span-6 lg:col-span-4 relative rounded-[28px] p-5 pt-6 flex flex-col group cursor-pointer overflow-hidden",
                "border border-border/50 ring-1 transition-all duration-300",
                "shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] hover:shadow-[0_24px_50px_-24px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
                TONE_GRADIENT[owner.tone],
                TONE_RING[owner.tone]
              )}
            >


              <div className="relative z-10 flex flex-col h-full">
                {/* Hero: big owner avatar with playful tilt on hover */}
                <div className="flex items-start gap-3">
                  <motion.span
                    whileHover={{ rotate: -6, scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className={cn(
                      "size-14 rounded-2xl grid place-items-center shrink-0 shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
                      TONE_SOFT[owner.tone]
                    )}
                  >
                    <OwnerIcon className="size-6" strokeWidth={2} />
                  </motion.span>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className={cn("text-[10px] uppercase tracking-[0.16em] font-bold", TONE_TEXT[owner.tone], "opacity-80")}>
                      {owner.name} play
                    </p>
                    <h3 className="font-display text-[19px] leading-tight tracking-tight mt-0.5">
                      {pb.name}
                    </h3>
                  </div>

                  {/* Connected apps — overlapping brand icons, top-right */}
                  <div className="flex items-center shrink-0 pt-1.5 -space-x-1.5">
                    {pb.apps.map((app) => {
                      const meta = APP_META[app];
                      if (!meta) return null;
                      const BrandIcon = meta.Icon;
                      return (
                        <span
                          key={app}
                          title={meta.label}
                          className="size-7 inline-flex items-center justify-center rounded-full bg-card border border-border/60 shadow-sm ring-2 ring-card transition-transform hover:-translate-y-0.5 hover:z-10"
                        >
                          {meta.img ? (
                            <img src={meta.img} alt={meta.label} className="size-3.5" />
                          ) : BrandIcon ? (
                            <BrandIcon className="size-3.5" style={{ color: meta.color }} />
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[12.5px] text-foreground/65 mt-3 leading-relaxed line-clamp-2">
                  {pb.purpose}
                </p>

                {/* Step dots + time saved */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pb.steps }).map((_, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-all",
                          idx === 0
                            ? cn("w-4", TONE_DOT[owner.tone])
                            : "bg-foreground/15 group-hover:bg-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {pb.steps} steps
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-baseline gap-1 text-[10px] font-semibold tabular-nums">
                    <Clock3 className="size-2.5 self-center text-muted-foreground" strokeWidth={2.5} />
                    <span className="text-foreground">~{pb.minutes}m</span>
                    <span className="text-muted-foreground/70 line-through">{pb.manualMinutes}m</span>
                  </span>
                </div>



                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pb.tags.map((t) => (
                    <span
                      key={t}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium",
                        TAG_STYLES[t] ?? "bg-muted text-foreground/70"
                      )}
                    >
                      <span className="size-1 rounded-full bg-current opacity-80" />
                      {t}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">

                  <span className="text-[11px] text-muted-foreground tabular-nums inline-flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full animate-pulse-glow", TONE_DOT[owner.tone])} />
                    {pb.usedThisWeek} runs this week
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-foreground group-hover:gap-2 transition-all">
                    Open
                    <ArrowUpRight className="size-3.5 group-hover:rotate-12 transition-transform" strokeWidth={2.25} />
                  </span>
                </div>
              </div>
            </motion.article>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-12 glass-card rounded-3xl p-10 text-center">
            <p className="font-display text-xl tracking-tight">No playbooks match</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try clearing the search or switching the player filter.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { TONE_DOT };
