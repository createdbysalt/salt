"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { Button } from "@repo/ui";
import { MemoryRecordTabHeader } from "@/app/_features/memory/components/MemoryRecordTabHeader";
import type { PlaybookCustomizeEntry, PlaybookAdjustment } from "../customize/queries";
import {
  addPlaybookCustomizeEntryAction,
  revertPlaybookCustomizeEntryAction,
} from "../customize/actions";
import { derivePlaybookPatterns } from "../customize/patterns";
import type { PlaybookApprovalRate } from "../services/earned-autonomy";
import {
  grantPlaybookAutonomyAction,
  declinePlaybookAutonomyOfferAction,
  revokePlaybookAutonomyAction,
} from "../actions/autonomy";
import { formatToolSlugForHumans } from "../utils/playbook-display";

interface PlaybookCustomizeTabProps {
  slug: string;
  entries: PlaybookCustomizeEntry[];
  adjustments: PlaybookAdjustment[];
  approvalRate?: PlaybookApprovalRate | null;
  openOffers: Array<{ playRunId: string; toolSlug: string; approvedCount: number }>;
}

/**
 * Playbook → Customize — the GROW surface, mirroring Memory → Customize.
 * You teach (guidance), Salt notices (patterns), Salt adapts (adjustments),
 * Salt earns (autonomy). Same design language as Memory → Customize: the
 * composer is the parent, an aurora thread ties the guidance doc to it, and
 * autonomy sits in the rail.
 */
export function PlaybookCustomizeTab({
  slug,
  entries,
  adjustments,
  approvalRate,
  openOffers,
}: PlaybookCustomizeTabProps) {
  const patterns = derivePlaybookPatterns(adjustments);

  return (
    <div className="space-y-4">
      <MemoryRecordTabHeader title="Customize" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="max-w-3xl space-y-10">
          {/* The composer is the parent; an aurora thread ties the guidance
              doc to it as its child — you write above, the line lands below. */}
          <div className="relative">
            <GuidanceComposer slug={slug} />
            <div
              aria-hidden
              className="absolute bottom-2 left-[21px] top-[50px] w-0.5 rounded-full bg-[linear-gradient(180deg,oklch(0.58_0.16_200_/_0.5),oklch(0.78_0.16_75_/_0.3)_60%,transparent)]"
            />
            <div className="mt-5 pl-10">
              <GuidanceDoc slug={slug} entries={entries} />
            </div>
          </div>

          {patterns.length > 0 ? <LearnedPatternsSection patterns={patterns} /> : null}
          {adjustments.length > 0 ? (
            <RecentAdjustmentsSection adjustments={adjustments} />
          ) : null}
        </div>

        <aside className="space-y-10 lg:sticky lg:top-6 lg:self-start">
          <AutonomySection
            slug={slug}
            approvalRate={approvalRate}
            openOffers={openOffers}
          />
        </aside>
      </div>
    </div>
  );
}

/* ── Guidance ─────────────────────────────────────────────────────────────── */

/** Each line carries a small provenance dot — lines Salt learned on its own
 *  glow aurora; the rest are quiet. Same canon as Memory → Customize. */
const SOURCE_ANNOTATIONS: Record<
  PlaybookCustomizeEntry["source"],
  { label: string; dotClassName: string }
> = {
  user: { label: "You wrote this", dotClassName: "bg-muted-foreground/40" },
  ask_salt: { label: "From your chat with me", dotClassName: "bg-primary" },
  correction: {
    label: "Learned from a correction",
    dotClassName: "bg-amber-500",
  },
  reflection: { label: "I noticed this", dotClassName: "surface-aurora" },
};

const DOC_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** The one text box on the surface, hoisted to the top — the same inset
 *  rounded-full pill as Memory → Customize: aurora spark, transparent input,
 *  active-pill submit. */
function GuidanceComposer({ slug }: { slug: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);

  const submit = async () => {
    const body = value.trim();
    if (!body || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const result = await addPlaybookCustomizeEntryAction(slug, body);
    busyRef.current = false;
    setBusy(false);
    if (result.success) {
      setValue("");
      toast.success("Saved. I'll use that on every run.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not save");
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 p-1.5 pl-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition focus-within:border-foreground/25 focus-within:bg-background dark:border-border dark:bg-background/60 dark:focus-within:bg-muted/40">
      <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-4 text-white" />
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Tell Salt how to run this play…"
        aria-label="Playbook guidance"
        maxLength={500}
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || value.trim().length === 0}
        className="surface-aurora shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="relative z-10 inline-flex items-center">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Remember this"}
        </span>
      </button>
    </div>
  );
}

/** The living doc — every guidance line, oldest to newest, each with quiet
 *  provenance and a hover-revealed revert. Injected into the draft + verify
 *  prompts, same machinery as Memory guidance. */
function GuidanceDoc({
  slug,
  entries,
}: {
  slug: string;
  entries: PlaybookCustomizeEntry[];
}) {
  const router = useRouter();
  const [revertingId, setRevertingId] = React.useState<string | null>(null);
  const active = entries.filter((entry) => entry.status === "active");

  const revert = async (entry: PlaybookCustomizeEntry) => {
    setRevertingId(entry.id);
    const result = await revertPlaybookCustomizeEntryAction(slug, entry.id);
    setRevertingId(null);
    if (result.success) {
      toast.success("Removed. I won't use that anymore.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not remove");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          What I&apos;ll use on every run
        </h2>
        {active.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {active.length}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        {active.length === 0 ? (
          <p className="py-3 text-sm leading-relaxed text-muted-foreground">
            Nothing here yet. Tell me how to run this play above, or correct a
            draft. Every line becomes part of how I work.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {active.map((entry) => {
              const annotation = SOURCE_ANNOTATIONS[entry.source];
              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="group flex items-start justify-between gap-4 py-2.5 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm leading-snug text-foreground">
                      {entry.body}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground/80">
                      <span
                        className={cn(
                          "inline-block size-1.5 rounded-full",
                          annotation.dotClassName
                        )}
                      />
                      {annotation.label}
                      {" · "}
                      {DOC_DATE_FORMAT.format(new Date(entry.createdAt))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revert(entry)}
                    disabled={revertingId === entry.id}
                    aria-label="Remove this line"
                    className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted/60 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {revertingId === entry.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ── Learned patterns ─────────────────────────────────────────────────────── */

function LearnedPatternsSection({
  patterns,
}: {
  patterns: ReturnType<typeof derivePlaybookPatterns>;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        title="Learned patterns"
        hint="Salt is watching for these. Patterns form as you edit and approve. They're not rules yet."
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {patterns.map((pattern) => (
          <span
            key={pattern.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              pattern.emerging
                ? "border-dashed border-border/60 text-muted-foreground"
                : "border-border bg-muted/60 text-foreground"
            )}
          >
            <Sparkles className="size-3" />
            {pattern.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/70">
        Solid = confirmed by your edits. Dashed = emerging, becomes a
        suggestion as it repeats.
      </p>
    </section>
  );
}

/* ── Recent adjustments ───────────────────────────────────────────────────── */

const ADJUSTMENT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function RecentAdjustmentsSection({
  adjustments,
}: {
  adjustments: PlaybookAdjustment[];
}) {
  return (
    <section className="space-y-3">
      <SectionTitle
        title="Recent adjustments"
        hint="Where Salt adapted. Corrections teach faster than settings."
      />
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        <ul className="divide-y divide-border/40">
          {adjustments.map((adjustment) => (
            <li
              key={adjustment.id}
              className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1"
            >
              <p className="min-w-0 flex-1 text-sm text-foreground">
                {adjustment.action === "edited"
                  ? "You edited a draft"
                  : "You skipped a draft"}{" "}
                <span className="text-muted-foreground">
                  →{" "}
                  {adjustment.action === "edited"
                    ? "Salt is watching what changed"
                    : "Watching: when this play fires"}
                </span>
              </p>
              <span className="shrink-0 text-xs text-muted-foreground/80">
                {ADJUSTMENT_DATE_FORMAT.format(new Date(adjustment.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Autonomy ─────────────────────────────────────────────────────────────── */

function AutonomySection({
  slug,
  approvalRate,
  openOffers,
}: {
  slug: string;
  approvalRate?: PlaybookApprovalRate | null;
  openOffers: Array<{ playRunId: string; toolSlug: string; approvedCount: number }>;
}) {
  const router = useRouter();
  const [busyTool, setBusyTool] = React.useState<string | null>(null);

  const act = async (
    toolSlug: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => {
    setBusyTool(toolSlug);
    const result = await action();
    setBusyTool(null);
    if (result.success) {
      toast.success(successMessage);
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not update");
    }
  };

  const grantedTools = approvalRate?.grantedTools ?? [];
  const approvedCount = approvalRate?.approvedCount ?? 0;
  const total = approvedCount + (approvalRate?.dismissedCount ?? 0);
  const percent =
    approvalRate?.approvalRate != null
      ? Math.round(approvalRate.approvalRate * 100)
      : null;
  const hasEarned = openOffers.length > 0 || grantedTools.length > 0;
  const hasProgress = percent !== null && total > 0;

  const heading = (
    <div className="flex items-center gap-2">
      <span className="surface-aurora grid size-6 shrink-0 place-items-center rounded-lg">
        <Sparkles className="relative z-10 size-3 text-white" />
      </span>
      <h2 className="text-sm font-semibold text-foreground">
        What I&apos;ve earned
      </h2>
    </div>
  );

  if (!hasEarned && !hasProgress) {
    return (
      <section className="space-y-4">
        {heading}
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nothing yet. As you approve this play&apos;s runs, I offer to
            handle repeated steps without asking. Earned, never assumed.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {heading}

      <div className="space-y-2">
        {openOffers.map((offer) => (
          <div
            key={offer.playRunId}
            className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3.5"
          >
            <p className="text-[13px] leading-snug text-foreground">
              This play has earned a step
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              You&apos;ve approved {formatToolSlugForHumans(offer.toolSlug)}{" "}
              {offer.approvedCount} times. Want me to run it without asking?
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() =>
                  void act(
                    offer.toolSlug,
                    () => grantPlaybookAutonomyAction(slug, offer.toolSlug),
                    "Got it. I'll run that step on my own."
                  )
                }
                disabled={busyTool !== null}
              >
                {busyTool === offer.toolSlug ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Let it run
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void act(
                    offer.toolSlug,
                    () => declinePlaybookAutonomyOfferAction(slug, offer.toolSlug),
                    "No problem. I'll keep asking."
                  )
                }
                disabled={busyTool !== null}
              >
                Keep asking
              </Button>
            </div>
          </div>
        ))}

        {grantedTools.map((toolSlug) => (
          <div
            key={toolSlug}
            className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3.5"
          >
            <p className="text-[13px] leading-snug text-foreground">
              Running on its own
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {formatToolSlugForHumans(toolSlug)} runs without asking. Turn this
              off anytime.
            </p>
            <button
              type="button"
              onClick={() =>
                void act(
                  toolSlug,
                  () => revokePlaybookAutonomyAction(slug, toolSlug),
                  "Back to asking you first."
                )
              }
              disabled={busyTool !== null}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
              {busyTool === toolSlug ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Ask me again
            </button>
          </div>
        ))}

        {!hasEarned && hasProgress ? (
          <div className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3.5">
            <p className="text-[13px] leading-snug text-foreground">
              Watching this play
            </p>
            <div className="space-y-1">
              <div
                role="img"
                aria-label={`Approval rate ${percent}%`}
                className="h-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-[image:var(--gradient-aurora)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {percent}% approved · {approvedCount} of {total} run
                {total === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ── Shared ───────────────────────────────────────────────────────────────── */

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
