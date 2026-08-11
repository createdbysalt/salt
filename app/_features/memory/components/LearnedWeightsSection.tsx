"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import {
  resetLearnedWeight,
  resetAllLearnedWeights,
} from "../care/actions";
import type { SignalSourceWeight } from "../care/reflection";

/**
 * Format a signal source for display.
 * e.g., "email_signature" → "email signatures"
 */
function formatSignalSource(source: string): string {
  return source
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toLowerCase());
}

/**
 * Format a field type for display.
 * e.g., "company_name" → "company name"
 */
function formatFieldType(field: string): string {
  return field.replace(/_/g, " ");
}

/**
 * Format weight as a percentage for display.
 * e.g., 0.7 → "70%"
 */
function formatWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

interface LearnedWeightCardProps {
  weight: SignalSourceWeight;
  workspaceId: string;
  onReset: () => void;
}

function LearnedWeightCard({ weight, workspaceId, onReset }: LearnedWeightCardProps) {
  const [isPending, startTransition] = useTransition();
  const confidence = Math.round(weight.weightAdjustment * 100);

  function handleReset() {
    startTransition(async () => {
      try {
        await resetLearnedWeight(
          workspaceId,
          weight.signalSource,
          weight.fieldType
        );
        toast.success("Learning reset");
        onReset();
      } catch {
        toast.error("Failed to reset");
      }
    });
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug text-foreground">
          More careful with{" "}
          <span className="font-medium">{formatSignalSource(weight.signalSource)}</span>
          {" "}for{" "}
          <span className="font-medium">{formatFieldType(weight.fieldType)}</span>
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          aria-label="Reset this pattern"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
        </button>
      </div>
      <div className="space-y-1">
        <div
          role="img"
          aria-label={`Confidence ${confidence}%`}
          className="h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-[image:var(--gradient-aurora)]"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatWeight(weight.weightAdjustment)} confidence ·{" "}
          {weight.correctionCount} correction{weight.correctionCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}

interface LearnedWeightsSectionProps {
  workspaceId: string;
  initialWeights: SignalSourceWeight[];
}

export function LearnedWeightsSection({
  workspaceId,
  initialWeights,
}: LearnedWeightsSectionProps) {
  const [weights, setWeights] = useState(initialWeights);
  const [isPending, startTransition] = useTransition();

  function handleResetAll() {
    startTransition(async () => {
      try {
        const result = await resetAllLearnedWeights(workspaceId);
        toast.success(`Reset ${result.deleted} learned adjustment${result.deleted === 1 ? "" : "s"}`);
        setWeights([]);
      } catch {
        toast.error("Failed to reset");
      }
    });
  }

  function handleSingleReset(id: string) {
    setWeights((prev) => prev.filter((w) => w.id !== id));
  }

  const heading = (
    <div className="flex items-center gap-2">
      <span className="surface-aurora grid size-6 shrink-0 place-items-center rounded-lg">
        <Sparkles className="relative z-10 size-3 text-white" />
      </span>
      <h2 className="text-sm font-semibold text-foreground">
        Patterns I&apos;m picking up
      </h2>
    </div>
  );

  if (weights.length === 0) {
    return (
      <section className="space-y-4">
        {heading}
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nothing yet. As you correct mistakes in Handled items, I learn to
            be more careful about unreliable sources — each pattern shows up
            here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {heading}
        {weights.length > 1 && (
          <button
            type="button"
            onClick={handleResetAll}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RotateCcw className="size-3" />
            )}
            Reset all
          </button>
        )}
      </div>

      <div className="space-y-2">
        {weights.map((weight) => (
          <LearnedWeightCard
            key={weight.id}
            weight={weight}
            workspaceId={workspaceId}
            onReset={() => handleSingleReset(weight.id)}
          />
        ))}
      </div>
    </section>
  );
}
