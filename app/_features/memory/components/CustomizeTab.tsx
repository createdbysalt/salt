"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { Button, Label, Slider } from "@repo/ui";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import {
  MEMORY_CUSTOMIZE_ENTITY_LABELS,
  MEMORY_CUSTOMIZE_ENTITY_TYPES,
  defaultGuidanceForType,
  type MemoryCustomizeEntityType,
} from "../customize/default-guidance";
import {
  addCustomizeEntry,
  revertCustomizeEntry,
} from "../customize/actions";
import { detectHardExclusion } from "../customize/hard-exclusion";
import type { CustomizeEntry } from "../customize/queries";
import { buildMemoryPath } from "../memory-tab-routing";
import { updateMemoryCareThreshold } from "../care/actions";
import type { SignalSourceWeight } from "../care/reflection";
import { LearnedWeightsSection } from "./LearnedWeightsSection";

/**
 * Memory → Customize (2026-08-10) — what Salt looks for, per record type.
 *
 * Two-zone doc, no overwriting:
 * - Zone 1 ("What I look for") is Salt-authored and read-only, rendered
 *   from the live field registry so the copy can't drift from behavior.
 * - Zone 2 ("Your customizations") is writable: free-text lines the intake
 *   pipeline reads when deciding what becomes a record. Every line carries
 *   its source and a revert.
 *
 * The trust card (how boldly Salt acts) and the learned-weights list live
 * here too. Care itself is always on — you steer it, you don't switch it
 * off.
 */

interface CustomizeTabProps {
  workspaceId: string;
  activeType: MemoryCustomizeEntityType;
  entriesByType: Partial<Record<MemoryCustomizeEntityType, CustomizeEntry[]>>;
  initialThreshold: number;
  learnedWeights: SignalSourceWeight[];
}

export function CustomizeTab({
  workspaceId,
  activeType,
  entriesByType,
  initialThreshold,
  learnedWeights,
}: CustomizeTabProps) {
  const guidance = defaultGuidanceForType(activeType);
  const entries = entriesByType[activeType] ?? [];

  return (
    <div className="max-w-3xl space-y-10">
      <PlaysSectionHeader
        eyebrow="Steer what Salt remembers"
        title="Customize"
        description="Here's what I look for when I decide what becomes a record — tell me when it's wrong."
      />

      <div
        role="group"
        aria-label="Record type"
        className="flex flex-wrap items-center gap-1.5"
      >
        {MEMORY_CUSTOMIZE_ENTITY_TYPES.map((type) => (
          <Link
            key={type}
            href={buildMemoryPath("customize", type)}
            aria-current={type === activeType ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
              type === activeType
                ? "border-foreground/20 bg-muted text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {MEMORY_CUSTOMIZE_ENTITY_LABELS[type]}
          </Link>
        ))}
      </div>

      <DefaultZone guidance={guidance} />

      <CustomizationsZone entityType={activeType} entries={entries} />

      <TrustCard workspaceId={workspaceId} initialThreshold={initialThreshold} />

      <LearnedWeightsSection
        workspaceId={workspaceId}
        initialWeights={learnedWeights}
      />
    </div>
  );
}

/** Zone 1 — read-only. Summary by default; the curious expand the detail. */
function DefaultZone({
  guidance,
}: {
  guidance: ReturnType<typeof defaultGuidanceForType>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-semibold text-foreground">
        What I look for
      </h2>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {guidance.summary}
      </p>
      <div className="space-y-1.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-3 transition-transform", open && "rotate-180")}
          />
          See exactly what I do
        </button>
        {open ? (
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
            {guidance.sections.map((section) => (
              <div key={section.heading} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {section.heading}
                </p>
                <ul className="space-y-1.5">
                  {section.lines.map((line) => (
                    <li
                      key={line}
                      className="text-[13px] leading-snug text-muted-foreground"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs leading-snug text-muted-foreground/80">
              These are my defaults — changing them means changing how Salt
              works, not text on this page. Your customizations below steer me
              without touching the defaults.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const SOURCE_BADGES: Record<CustomizeEntry["source"], string> = {
  user: "You added this",
  ask_salt: "From your chat with me",
  correction: "From a correction",
  reflection: "I learned this",
};

/** Zone 2 — the writable doc. Every line is attributed and revertible. */
function CustomizationsZone({
  entityType,
  entries,
}: {
  entityType: MemoryCustomizeEntityType;
  entries: CustomizeEntry[];
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [revertingId, setRevertingId] = React.useState<string | null>(null);

  const submit = async () => {
    const body = value.trim();
    if (!body) return;
    setBusy(true);
    const result = await addCustomizeEntry({
      entityType,
      body,
      source: "user",
    });
    setBusy(false);
    if (result.success) {
      setValue("");
      toast.success(
        result.enforcement === "enforced"
          ? "I'll always keep that out."
          : "I'll remember that.",
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const revert = async (entry: CustomizeEntry) => {
    setRevertingId(entry.id);
    const result = await revertCustomizeEntry(entry.id);
    setRevertingId(null);
    if (result.success) {
      toast.success("Forgotten — I won't use that anymore.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Your customizations
        </h2>
        <p className="text-xs leading-snug text-muted-foreground">
          Anything here steers what I look for in{" "}
          {MEMORY_CUSTOMIZE_ENTITY_LABELS[entityType].toLowerCase()}. Write it
          the way you&apos;d say it.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing yet — the defaults above are running the show.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] leading-snug text-foreground">
                  {entry.body}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SOURCE_BADGES[entry.source]}
                  {" · "}
                  {detectHardExclusion(entry.body)
                    ? "I always keep this out"
                    : "I keep this in mind"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void revert(entry)}
                disabled={revertingId === entry.id}
                aria-label="Revert this customization"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
              >
                {revertingId === entry.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Tell Salt what to look for…"
          aria-label="Tell Salt what to look for"
          maxLength={500}
          className="h-9 min-w-0 flex-1 rounded-full border border-border/60 bg-background px-4 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4"
          disabled={busy || value.trim().length === 0}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Remember this"}
        </Button>
      </div>
    </section>
  );
}

const THRESHOLD_LABELS: Record<number, { label: string; description: string }> = {
  50: {
    label: "More autonomous",
    description: "I act faster with less evidence. Good for low-risk records.",
  },
  65: {
    label: "Balanced",
    description: "I wait for moderate evidence before acting.",
  },
  85: {
    label: "Conservative",
    description:
      "I accumulate strong evidence before acting. Recommended for most people.",
  },
  100: {
    label: "Always ask",
    description: "I never apply changes on my own; everything waits for you.",
  },
};

function getThresholdMeta(value: number) {
  if (value >= 95) return THRESHOLD_LABELS[100];
  if (value >= 75) return THRESHOLD_LABELS[85];
  if (value >= 55) return THRESHOLD_LABELS[65];
  return THRESHOLD_LABELS[50];
}

/**
 * The trust card — the one control that governs how boldly Salt acts on
 * this whole surface, including anything Salt writes to the doc itself.
 */
function TrustCard({
  workspaceId,
  initialThreshold,
}: {
  workspaceId: string;
  initialThreshold: number;
}) {
  const [threshold, setThreshold] = React.useState(initialThreshold);
  const [savedThreshold, setSavedThreshold] = React.useState(initialThreshold);
  const [saving, setSaving] = React.useState(false);

  const hasChanges = threshold !== savedThreshold;
  const thresholdMeta = getThresholdMeta(threshold);

  const save = async () => {
    setSaving(true);
    try {
      await updateMemoryCareThreshold(workspaceId, threshold);
      setSavedThreshold(threshold);
      toast.success("Saved — I'll act accordingly.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">
        How boldly I act
      </h2>
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              Act on my own when I&apos;m this sure
            </Label>
            <span className="text-2xl font-semibold tabular-nums">
              {threshold}%
            </span>
          </div>

          <Slider
            value={[threshold]}
            onValueChange={([value]) => setThreshold(value)}
            min={50}
            max={100}
            step={5}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More autonomous</span>
            <span>Always ask</span>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="font-medium text-sm">{thresholdMeta.label}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {thresholdMeta.description}
            </p>
          </div>

          {hasChanges && (
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => void save()}
                disabled={saving}
                className="min-w-[100px]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
