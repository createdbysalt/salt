"use client";

import { Slider } from "@repo/ui";
import { cn } from "@repo/utils";
import type { VoiceSpectrums } from "../types";
import {
  VOICE_SPECTRUM_META,
  spectrumActiveSide,
  spectrumLeanBadge,
} from "../utils/voice-spectrum-meta";

type VoiceSpectrumControlsProps = {
  value: VoiceSpectrums;
  onValueChange: (next: VoiceSpectrums) => void;
  onValueCommit: (key: keyof VoiceSpectrums, value: number) => void;
  disabled?: boolean;
};

export function VoiceSpectrumControls({
  value,
  onValueChange,
  onValueCommit,
  disabled = false,
}: VoiceSpectrumControlsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {VOICE_SPECTRUM_META.map(({ key, title, left, right, hint }) => {
        const current = value[key];
        const side = spectrumActiveSide(current);

        return (
          <div
            key={key}
            className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {hint}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-flame/10 px-2 py-0.5 text-[10px] font-medium text-flame">
                {spectrumLeanBadge(current, left, right)}
              </span>
            </div>

            <div className="relative px-0.5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0.5 top-[11px] flex justify-center"
              >
                <span className="h-2 w-px bg-border/80" />
              </div>
              <Slider
                value={[current]}
                onValueChange={(v) =>
                  onValueChange({ ...value, [key]: v[0] ?? current })
                }
                onValueCommit={(v) => onValueCommit(key, v[0] ?? current)}
                max={100}
                step={1}
                disabled={disabled}
                aria-label={`${title}: ${spectrumLeanBadge(current, left, right)}`}
                className={cn(
                  "py-2",
                  "[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted/80",
                  "[&_[data-slot=slider-range]]:bg-flame/75",
                  "[&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-border/80",
                  "[&_[data-slot=slider-thumb]]:bg-background [&_[data-slot=slider-thumb]]:shadow-md",
                  "[&_[data-slot=slider-thumb]]:hover:ring-4 [&_[data-slot=slider-thumb]]:hover:ring-flame/15",
                )}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span
                className={cn(
                  side === "left"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {left}
              </span>
              {side === "center" && (
                <span className="text-[10px] text-muted-foreground/70">
                  Balanced
                </span>
              )}
              <span
                className={cn(
                  side === "right"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {right}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
