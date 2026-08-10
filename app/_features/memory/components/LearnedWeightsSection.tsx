"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@repo/ui";
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
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-7 place-items-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3.5" strokeWidth={2} />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm text-foreground">
            Be more careful about{" "}
            <span className="font-medium">{formatSignalSource(weight.signalSource)}</span>
            {" "}for{" "}
            <span className="font-medium">{formatFieldType(weight.fieldType)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Confidence reduced to {formatWeight(weight.weightAdjustment)} · {weight.correctionCount} correction{weight.correctionCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        disabled={isPending}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RotateCcw className="size-4" />
        )}
        <span className="sr-only">Reset</span>
      </Button>
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

  if (weights.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          What Salt has learned
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Sparkles className="size-5" />
            <p className="text-sm">
              Salt hasn't learned any patterns yet. As you correct mistakes in Handled items,
              Salt will learn to be more careful about unreliable sources.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          What Salt has learned
        </h2>
        {weights.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <RotateCcw className="size-4 mr-1.5" />
            )}
            Reset all
          </Button>
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

      <p className="text-xs text-muted-foreground">
        These patterns are learned from your corrections in Filter → Handled.
        Reset to let Salt trust this source again.
      </p>
    </section>
  );
}
