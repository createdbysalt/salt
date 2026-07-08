import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Loader2, Check } from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiGmail, SiSlack, SiNotion, SiHubspot, SiLinear,
  SiZoom, SiGoogledrive, SiStripe, SiQuickbooks, SiFigma,
} from "react-icons/si";
import { PLAYERS, playerById, TONE_SOFT, TONE_DOT, type PlayerId, type Tone } from "@/app/_lib/demo/plays-demo-data";
import type { PlaybookBlueprintView, PlayTemplateView } from "@/app/_features/plays/types";
import { adoptBlueprint } from "@/app/_features/plays/actions";
import { blueprintTags, playbookKindLabel, requiredActionsToAppLabels } from "@/app/_features/plays/utils/playbook-display";
const SALT_ICON_SRC = "/landing/salt-icon.svg";
import { PlaysFilterGroupsContent } from "./PlaysFilterPopover";
import { PlaysSearchField } from "./PlaysSearchField";
import { cn } from "@repo/utils";
import { useRouter } from "next/navigation";
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const TAG_STYLES: Record<string, string> = {
  Auto: "bg-sky/15 text-sky",
  Manual: "bg-muted text-foreground/70",
  "Needs approval": "bg-flame/15 text-flame",
  "Auto-runs": "bg-violet/15 text-violet",
  Profile: "bg-foreground/8 text-foreground",
  Action: "bg-muted text-foreground/70",
  Capture: "bg-violet/15 text-violet",
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

export interface PlaybookTabProps {
  blueprints: PlaybookBlueprintView[];
  adoptedTemplates: PlayTemplateView[];
  onBlueprintAdopted?: () => void;
}

type AdoptionFilter = "active" | "not_adopted";

function isPlaybookActive(
  pb: PlaybookBlueprintView,
  adoptedBySlug: Map<string, PlayTemplateView>,
): boolean {
  if (pb.kind === "profile") return true;
  return adoptedBySlug.has(pb.slug);
}

export function PlaybookTab({
  blueprints,
  adoptedTemplates,
  onBlueprintAdopted,
}: PlaybookTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adoptingSlug, setAdoptingSlug] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [playerFilter, setPlayerFilter] = useState<PlayerId | "all">("all");
  const [adoptionFilter, setAdoptionFilter] = useState<AdoptionFilter | null>(null);

  const adoptedBySlug = useMemo(
    () =>
      new Map(
        adoptedTemplates.flatMap((template) =>
          template.blueprintSlug ? [[template.blueprintSlug, template] as const] : [],
        ),
      ),
    [adoptedTemplates],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return blueprints.filter((pb) => {
      if (playerFilter !== "all" && pb.playerSlug !== playerFilter) return false;
      if (adoptionFilter === "active" && !isPlaybookActive(pb, adoptedBySlug)) return false;
      if (adoptionFilter === "not_adopted" && isPlaybookActive(pb, adoptedBySlug)) return false;
      if (!term) return true;
      return (
        pb.name.toLowerCase().includes(term) ||
        (pb.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [adoptedBySlug, adoptionFilter, blueprints, playerFilter, q]);

  function handleAdopt(slug: string) {
    setAdoptingSlug(slug);
    startTransition(async () => {
      const result = await adoptBlueprint(slug);
      setAdoptingSlug(null);
      if (result.ok) {
        onBlueprintAdopted?.();
      }
    });
  }

  if (blueprints.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center">
        <p className="font-display text-xl tracking-tight">No system playbooks yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Salt-authored recipes appear here once the blueprint registry is seeded.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-6"
    >
      {/* Search + filter */}
      <PlaysSearchField
        value={q}
        onChange={setQ}
        placeholder="Search for a playbook"
        filterActive={adoptionFilter !== null || playerFilter !== "all"}
        filterContent={
          <PlaysFilterGroupsContent
            groups={[
              {
                label: "Status",
                options: [
                  { id: "active", label: "Active" },
                  { id: "not_adopted", label: "Not adopted yet" },
                ],
                value: adoptionFilter,
                onChange: (id) => setAdoptionFilter(id as AdoptionFilter | null),
              },
              {
                label: "Player",
                options: PLAYERS.map((p) => ({
                  id: p.id,
                  label: p.name,
                  monogram: p.monogram,
                  swatchClass: TONE_SOFT[p.tone],
                })),
                value: playerFilter === "all" ? null : playerFilter,
                onChange: (id) => setPlayerFilter((id as PlayerId) ?? "all"),
              },
            ]}
          />
        }
      />

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-[minmax(0,auto)]">
        {filtered.map((pb, i) => {
          const owner = playerById(pb.playerSlug);
          const OwnerIcon = owner.icon;
          const adopted = adoptedBySlug.get(pb.slug);
          const apps = pb.kind === "profile" ? ["Salt"] : requiredActionsToAppLabels(pb.requiredActions);
          const tags = blueprintTags(pb.requiredActions, pb.kind);
          const kindLabel = playbookKindLabel(pb.kind);
          const isAdopting = isPending && adoptingSlug === pb.slug;
          const isProfile = pb.kind === "profile";
          return (
            <motion.article
              key={pb.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.03, ease: APPLE_EASE }}
              whileHover={{ y: -4 }}
              onClick={() => {
                if (isProfile) router.push(`/plays/playbooks/${pb.slug}`);
              }}
              onKeyDown={(event) => {
                if (isProfile && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  router.push(`/plays/playbooks/${pb.slug}`);
                }
              }}
              role={isProfile ? "link" : undefined}
              tabIndex={isProfile ? 0 : undefined}
              className={cn(
                "col-span-12 sm:col-span-6 lg:col-span-4 relative rounded-[28px] p-5 pt-6 flex flex-col group overflow-hidden",
                "border border-border/50 ring-1 transition-all duration-300",
                "shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] hover:shadow-[0_24px_50px_-24px_color-mix(in_oklab,var(--foreground)_22%,transparent)]",
                TONE_GRADIENT[owner.tone],
                TONE_RING[owner.tone],
                isProfile && "cursor-pointer ring-violet/20 hover:ring-violet/40",
                !isProfile && "hover:ring-foreground/20",
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
                    {apps.map((app) => {
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
                  {pb.description}
                </p>

                {/* Step dots + version */}
                <div className="mt-4 flex items-center gap-3">
                  {!isProfile ? (
                    <>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.max(1, pb.stepCount) }).map((_, idx) => (
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
                        {pb.stepCount} steps
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                      {pb.fillRuleCount} fill rules
                    </span>
                  )}
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-baseline gap-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    v{pb.version}
                  </span>
                  {pb.reliabilityLabel && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] font-semibold text-foreground/70">
                        {pb.reliabilityLabel}
                      </span>
                    </>
                  )}
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium",
                      TAG_STYLES[kindLabel] ?? "bg-muted text-foreground/70",
                    )}
                  >
                    <span className="size-1 rounded-full bg-current opacity-80" />
                    {kindLabel}
                  </span>
                  {tags.map((t) => (
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
                    {isProfile ? (
                      <>
                        <Sparkles className="size-3 text-muted-foreground" strokeWidth={2} />
                        Keeper upkeep
                      </>
                    ) : adopted ? (
                      <>
                        <Check className={cn("size-3.5", TONE_TEXT[owner.tone])} strokeWidth={2.5} />
                        Adopted
                        {adopted.upgradeAvailable && " · upgrade available"}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3 text-muted-foreground" strokeWidth={2} />
                        Salt recipe
                      </>
                    )}
                  </span>
                  {isProfile ? (
                    <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold", TONE_TEXT[owner.tone])}>
                      View rules
                      <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
                    </span>
                  ) : adopted ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-foreground">
                      Recipe active
                      <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isAdopting}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAdopt(pb.slug);
                      }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-foreground hover:gap-2 transition-all disabled:opacity-50"
                    >
                      {isAdopting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      Adopt
                      <ArrowUpRight className="size-3.5 group-hover:rotate-12 transition-transform" strokeWidth={2.25} />
                    </button>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-12 glass-card rounded-3xl p-10 text-center">
            <p className="font-display text-xl tracking-tight">No playbooks match</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try clearing the search or adjusting the filters.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { TONE_DOT };
