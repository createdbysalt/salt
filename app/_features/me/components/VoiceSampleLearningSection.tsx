"use client";

import {
  Check,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button, Textarea } from "@repo/ui";
import { cn } from "@repo/utils";
import type { VoiceExtractionResult } from "../utils/voice-extraction-prompt";
import { ExtractedVoiceProfileCard } from "./ExtractedVoiceProfileCard";
import {
  SAMPLE_MAX_COUNT,
  SAMPLE_MIN_TOTAL,
  countWords,
  sampleHasMinimumContent,
  sampleReadiness,
  sampleReadinessProgress,
  SAMPLE_READINESS_LABEL,
} from "../utils/voice-sample-utils";

type VoiceSampleLearningSectionProps = {
  samples: string[];
  extracting: boolean;
  extraction: VoiceExtractionResult | null;
  onAddSample: () => void;
  onUpdateSample: (index: number, value: string) => void;
  onRemoveSample: (index: number) => void;
  onExtract: () => void;
  onApplyExtraction: () => void;
  onDiscardExtraction: () => void;
};

export function VoiceSampleLearningSection({
  samples,
  extracting,
  extraction,
  onAddSample,
  onUpdateSample,
  onRemoveSample,
  onExtract,
  onApplyExtraction,
  onDiscardExtraction,
}: VoiceSampleLearningSectionProps) {
  const filledSamples = samples.filter((s) => s.trim());
  const totalWords = samples.reduce((sum, s) => sum + countWords(s), 0);
  const readiness = sampleReadiness(totalWords);
  const progress = sampleReadinessProgress(totalWords);
  const canExtract = totalWords >= SAMPLE_MIN_TOTAL;
  const validSampleCount = samples.filter((s) =>
    sampleHasMinimumContent(s),
  ).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-flame/10 text-flame">
            <Wand2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Paste writing you&apos;ve actually sent
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Emails, DMs, proposals, or blog posts work best. Salt reads your
              patterns — tone, rhythm, and word choices — then suggests a voice
              profile you can apply or tweak.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span
                  className={cn(
                    readiness === "empty" && "text-muted-foreground",
                    readiness === "building" && "text-amber-700 dark:text-amber-400",
                    readiness === "ready" && "text-emerald-700 dark:text-emerald-400",
                    readiness === "rich" && "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {SAMPLE_READINESS_LABEL[readiness]}
                </span>
                {filledSamples.length > 0 && (
                  <span className="text-muted-foreground">
                    {filledSamples.length} sample
                    {filledSamples.length !== 1 ? "s" : ""}
                    {validSampleCount > 0 && validSampleCount < filledSamples.length
                      ? " · some need more content"
                      : ""}
                  </span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    readiness === "empty" && "w-0 bg-muted-foreground/30",
                    readiness === "building" && "bg-amber-500/70",
                    (readiness === "ready" || readiness === "rich") &&
                      "bg-emerald-500/70",
                  )}
                  style={{
                    width:
                      readiness === "empty"
                        ? "0%"
                        : `${Math.max(progress * 100, readiness === "building" ? 8 : 0)}%`,
                  }}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Each sample needs a solid paragraph. More variety helps Salt
                match your real voice.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {samples.map((sample, index) => {
          const ready = sampleHasMinimumContent(sample);
          const hasContent = sample.trim().length > 0;

          return (
            <div
              key={index}
              className={cn(
                "rounded-2xl border bg-card/80 shadow-sm transition-colors",
                ready
                  ? "border-emerald-500/25"
                  : hasContent
                    ? "border-amber-500/20"
                    : "border-border/60",
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  <span className="font-medium text-foreground/80">
                    Sample {index + 1}
                  </span>
                  {ready ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="size-2.5" />
                      Ready
                    </span>
                  ) : hasContent ? (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      Add more
                    </span>
                  ) : null}
                </div>
                {samples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSample(index)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                    Remove
                  </button>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <Textarea
                  value={sample}
                  onChange={(e) => onUpdateSample(index, e.target.value)}
                  rows={6}
                  placeholder="Paste an email, message, or document you've written…"
                  className="field-sizing-fixed min-h-[9rem] resize-y bg-background leading-relaxed"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddSample}
          disabled={samples.length >= SAMPLE_MAX_COUNT}
        >
          <Plus className="size-3.5" />
          Add another sample
        </Button>

        <Button
          size="sm"
          onClick={onExtract}
          disabled={!canExtract || extracting}
          className="sm:min-w-[160px]"
        >
          {extracting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          {extracting ? "Analyzing…" : "Extract voice"}
        </Button>
      </div>

      {extraction && (
        <ExtractedVoiceProfileCard
          extraction={extraction}
          onApply={onApplyExtraction}
          onDiscard={onDiscardExtraction}
        />
      )}
    </div>
  );
}
