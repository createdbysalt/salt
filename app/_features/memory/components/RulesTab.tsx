"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Brain,
  FileText,
  Link2,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button, Label, Slider } from "@repo/ui";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { CareCapabilityToggle } from "./CareCapabilityToggle";
import { updateMemoryCareThreshold } from "../care/actions";
import type { CareCapability } from "../care/types";

/**
 * Memory → Rules — the rules themselves.
 *
 * - Care capabilities: plain-language cards over the Memory Care
 *   capabilities (`app/_features/memory/care`).
 * - Admission policy: blocklist + global autonomy stance.
 *
 * The flywheel: Rules shape Filter; feedback in Filter flows back here as
 * lessons (fast-follow).
 */

export interface CareCapabilityState {
  capability: CareCapability;
  slug: string;
  enabled: boolean;
}

const CAPABILITY_META: Record<
  CareCapability,
  { title: string; description: string; icon: typeof Brain }
> = {
  records: {
    title: "Fill in record details",
    description:
      "Salt keeps your records complete and accurate by learning from your connected accounts.",
    icon: Wand2,
  },
  hygiene: {
    title: "Keep records clean",
    description:
      "Detects duplicates, stale records, and data quality issues before they pile up.",
    icon: Sparkles,
  },
  connections: {
    title: "Connect related records",
    description:
      "Infers relationships between people, orgs, and work from emails, meetings, and files.",
    icon: Link2,
  },
  notes: {
    title: "Take notes for me",
    description:
      "Captures note-worthy context as it happens and keeps notes tidy over time.",
    icon: FileText,
  },
};

const CAPABILITY_ORDER: CareCapability[] = [
  "records",
  "hygiene",
  "connections",
  "notes",
];

const THRESHOLD_LABELS: Record<number, { label: string; description: string }> = {
  50: {
    label: "More autonomous",
    description: "Salt acts faster with less evidence. Good for low-risk records.",
  },
  65: {
    label: "Balanced",
    description: "Salt waits for moderate evidence before acting.",
  },
  85: {
    label: "Conservative",
    description:
      "Salt accumulates strong evidence before acting. Recommended for most users.",
  },
  100: {
    label: "Always ask",
    description: "Salt never applies changes on its own; everything waits in Watching.",
  },
};

function getThresholdMeta(value: number) {
  if (value >= 95) return THRESHOLD_LABELS[100];
  if (value >= 75) return THRESHOLD_LABELS[85];
  if (value >= 55) return THRESHOLD_LABELS[65];
  return THRESHOLD_LABELS[50];
}

interface RulesTabProps {
  workspaceId: string;
  capabilities: CareCapabilityState[];
  initialThreshold: number;
}

export function RulesTab({
  workspaceId,
  capabilities,
  initialThreshold,
}: RulesTabProps) {
  const [threshold, setThreshold] = useState(initialThreshold);
  const [savedThreshold, setSavedThreshold] = useState(initialThreshold);
  const [isPending, startTransition] = useTransition();

  const hasChanges = threshold !== savedThreshold;
  const thresholdMeta = getThresholdMeta(threshold);

  const orderedCapabilities = CAPABILITY_ORDER.map((capability) => {
    const state = capabilities.find((c) => c.capability === capability);
    const meta = CAPABILITY_META[capability];
    return state ? { ...state, ...meta } : null;
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  function handleSaveThreshold() {
    startTransition(async () => {
      try {
        await updateMemoryCareThreshold(workspaceId, threshold);
        setSavedThreshold(threshold);
        toast.success("Autonomy settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    });
  }

  return (
    <div className="space-y-10">
      <PlaysSectionHeader
        eyebrow="The rules themselves"
        title="Rules"
        description="What Salt does to care for your Memory, and what it lets in. Changes here shape what you see in Filter."
      />

      {/* CARE CAPABILITIES */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Care capabilities
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {orderedCapabilities.map((capability) => (
            <div
              key={capability.capability}
              className="rounded-2xl border border-border/60 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-muted/70 text-muted-foreground">
                  <capability.icon className="size-4.5" strokeWidth={1.75} />
                </span>
                <CareCapabilityToggle
                  workspaceId={workspaceId}
                  capability={capability.capability}
                  initialEnabled={capability.enabled}
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {capability.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ADMISSION POLICY */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Admission policy
        </h2>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-medium">
                  Auto-apply threshold
                </Label>
              </div>
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
                  onClick={handleSaveThreshold}
                  disabled={isPending}
                  className="min-w-[100px]"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* P11: Blocklist moved to Sources → Activity → Kept Out */}
        <p className="text-[13px] text-muted-foreground">
          Blocklist settings are now in{" "}
          <a href="/sources?tab=activity" className="text-primary hover:underline">
            Sources → Activity
          </a>
          , alongside kept-out items.
        </p>
      </section>
    </div>
  );
}
