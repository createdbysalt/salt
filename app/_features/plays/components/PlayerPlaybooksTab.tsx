"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import type { PlayerWithVisual } from "../players/visual";
import {
  PLAYER_COLOR_GRADIENT,
  PLAYER_COLOR_RING,
  PLAYER_COLOR_SOFT,
  PLAYER_COLOR_TEXT,
} from "../players/visual";
import type { PlaybookBlueprintView, PlayTemplateView } from "../types";
import { adoptBlueprint } from "../actions";
import { playbookHeroEyebrow } from "../utils/playbook-display";

const searchInputClassName =
  "h-9 w-full rounded-full border border-border/60 bg-background pl-10 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

interface PlayerPlaybooksTabProps {
  player: PlayerWithVisual;
  blueprints: PlaybookBlueprintView[];
  adoptedTemplates: PlayTemplateView[];
}

export function PlayerPlaybooksTab({
  player,
  blueprints,
  adoptedTemplates,
}: PlayerPlaybooksTabProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [adoptingSlug, setAdoptingSlug] = useState<string | null>(null);

  const PlayerIcon = player.icon;

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
    const term = query.trim().toLowerCase();
    if (!term) return blueprints;
    return blueprints.filter(
      (pb) =>
        pb.name.toLowerCase().includes(term) ||
        (pb.description ?? "").toLowerCase().includes(term),
    );
  }, [blueprints, query]);

  function handleAdopt(slug: string) {
    setAdoptingSlug(slug);
    startTransition(async () => {
      await adoptBlueprint(slug);
      setAdoptingSlug(null);
    });
  }

  if (blueprints.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-xl tracking-tight">No playbooks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {player.name} doesn&apos;t have any playbooks assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search playbooks"
          aria-label="Search playbooks"
          className={searchInputClassName}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No playbooks match your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((pb, i) => {
            const adopted = adoptedBySlug.get(pb.slug);
            const isProfile = pb.kind === "profile";
            const isAdopting = isPending && adoptingSlug === pb.slug;
            const eyebrow = playbookHeroEyebrow(pb.kind, pb.playerSlug);

            return (
              <motion.article
                key={pb.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.025, ease: APPLE_EASE }}
                whileHover={{ y: -3 }}
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
                  "group relative flex aspect-square flex-col gap-2 overflow-hidden rounded-2xl border border-border/50 p-3.5 sm:p-4",
                  "ring-1 transition-all duration-300",
                  "shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]",
                  "hover:shadow-[0_16px_36px_-20px_color-mix(in_oklab,var(--foreground)_20%,transparent)]",
                  PLAYER_COLOR_GRADIENT[player.color],
                  PLAYER_COLOR_RING[player.color],
                  isProfile && "cursor-pointer",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <motion.span
                    whileHover={{ rotate: -5, scale: 1.06 }}
                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl shadow-sm",
                      PLAYER_COLOR_SOFT[player.color],
                    )}
                  >
                    <PlayerIcon className="size-4" strokeWidth={2} />
                  </motion.span>

                  {isProfile ? (
                    <ArrowUpRight
                      className={cn(
                        "size-3.5 shrink-0 opacity-0 transition-all group-hover:opacity-100",
                        PLAYER_COLOR_TEXT[player.color],
                      )}
                      strokeWidth={2.25}
                    />
                  ) : adopted ? (
                    <Check
                      className={cn("size-3.5 shrink-0", PLAYER_COLOR_TEXT[player.color])}
                      strokeWidth={2.5}
                    />
                  ) : null}
                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-end">
                  <p
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.14em] opacity-80",
                      PLAYER_COLOR_TEXT[player.color],
                    )}
                  >
                    {eyebrow}
                  </p>
                  <h3 className="mt-1 line-clamp-1 font-display text-[15px] leading-snug tracking-tight text-foreground">
                    {pb.name}
                  </h3>
                  {pb.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-foreground/60">
                      {pb.description}
                    </p>
                  ) : null}
                </div>

                {!isProfile && !adopted ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isAdopting}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAdopt(pb.slug);
                    }}
                    className="h-7 w-full text-xs"
                  >
                    {isAdopting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Adopt"
                    )}
                  </Button>
                ) : null}
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
