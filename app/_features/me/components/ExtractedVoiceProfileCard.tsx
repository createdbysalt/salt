"use client";

import {
  Check,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button, Textarea } from "@repo/ui";
import { cn } from "@repo/utils";
import type { VoiceExtractionResult } from "../utils/voice-extraction-prompt";
import {
  VOICE_SPECTRUM_META,
  spectrumLeanLabel,
} from "../utils/voice-spectrum-meta";
import {
  extractionConfidenceLabel,
  sampleHasMinimumContent,
} from "../utils/voice-sample-utils";

type ExtractedVoiceProfileCardProps = {
  extraction: VoiceExtractionResult;
  onApply: () => void;
  onDiscard: () => void;
};

export function ExtractedVoiceProfileCard({
  extraction,
  onApply,
  onDiscard,
}: ExtractedVoiceProfileCardProps) {
  const confidence = extractionConfidenceLabel(extraction.confidence);

  return (
    <div className="overflow-hidden rounded-2xl border border-flame/25 bg-gradient-to-br from-card via-card to-flame/[0.08] shadow-sm">
      <div className="border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-flame/10 text-flame">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                What Salt found in your writing
              </p>
              <p className="text-[11px] text-muted-foreground">
                Review before applying to your voice profile
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              extraction.confidence >= 0.8
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : extraction.confidence >= 0.6
                  ? "border-flame/30 bg-flame/10 text-flame"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          >
            {confidence}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="rounded-xl border border-border/50 bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground">
          {extraction.summary}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-background/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Tone
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraction.tone.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-flame/30 bg-flame/10 px-2.5 py-1 text-[12px] text-flame"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-background/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Feel
            </p>
            <ul className="mt-2 space-y-1">
              {VOICE_SPECTRUM_META.map(({ key, title, left, right }) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="text-muted-foreground">{title}</span>
                  <span className="font-medium text-foreground">
                    {spectrumLeanLabel(
                      extraction.spectrums[key],
                      left,
                      right,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {extraction.styleNotes && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Style notes
            </p>
            <p className="rounded-xl border border-border/50 bg-muted/25 px-4 py-3 text-sm leading-relaxed text-foreground/90">
              {extraction.styleNotes}
            </p>
          </div>
        )}

        {(extraction.terminology.preferred.length > 0 ||
          extraction.terminology.avoid.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {extraction.terminology.preferred.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Words you use
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {extraction.terminology.preferred.slice(0, 8).map((word) => (
                    <span
                      key={word}
                      className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {extraction.terminology.avoid.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Words you avoid
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {extraction.terminology.avoid.slice(0, 8).map((word) => (
                    <span
                      key={word}
                      className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
          <Button size="sm" onClick={onApply}>
            <Check className="size-3.5" />
            Apply to my voice
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}
