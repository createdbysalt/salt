"use client";

import { Building2, Layers, Sparkles, User } from "lucide-react";
import { cn } from "@repo/utils";
import type { EffectiveVoice } from "../types";
import {
  VOICE_SPECTRUM_META,
  spectrumActiveSide,
  spectrumLeanLabel,
} from "../utils/voice-spectrum-meta";

type EffectiveVoiceCardProps = {
  voice: EffectiveVoice;
  /** Tone words added on the personal layer (for attribution chips). */
  personalTone?: string[];
};

function sourceLabel(source: EffectiveVoice["source"]) {
  const parts: string[] = [];
  if (source.tone === "merged") parts.push("Tone merged");
  else if (source.tone === "personal") parts.push("Personal tone");
  else if (source.tone === "workspace") parts.push("Workspace tone");

  if (source.styleGuide === "merged") parts.push("Style guide merged");
  else if (source.styleGuide === "personal") parts.push("Personal style guide");

  if (source.spectrums === "personal") parts.push("Personal spectrums");
  else if (source.spectrums === "workspace") parts.push("Workspace spectrums");
  else parts.push("Default spectrums");

  return parts.join(" · ");
}

export function EffectiveVoiceCard({
  voice,
  personalTone = [],
}: EffectiveVoiceCardProps) {
  const styleGuide = voice.styleGuide.trim();
  const termCount =
    voice.terminology.preferred.length + voice.terminology.avoid.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-flame/[0.06] shadow-sm">
      <div className="border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-flame/10 text-flame">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                What Salt uses when writing as you
              </p>
              <p className="text-[11px] text-muted-foreground">
                Live preview of your merged voice settings
              </p>
            </div>
          </div>
          <span className="rounded-full border border-flame/20 bg-flame/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-flame">
            Effective voice
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VOICE_SPECTRUM_META.map(({ key, title, left, right }) => {
            const value = voice.spectrums[key];
            const side = spectrumActiveSide(value);
            const label = spectrumLeanLabel(value, left, right);

            return (
              <div
                key={key}
                className="rounded-xl border border-border/50 bg-background/70 px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {title}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    side === "center"
                      ? "text-foreground/80"
                      : "text-foreground",
                  )}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>

        {voice.tone.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Tone
            </p>
            <div className="flex flex-wrap gap-1.5">
              {voice.tone.map((t) => {
                const isPersonal = personalTone.includes(t);
                return (
                  <span
                    key={t}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]",
                      isPersonal
                        ? "border-flame/30 bg-flame/10 text-flame"
                        : "border-border/60 bg-muted/40 text-foreground/80",
                    )}
                  >
                    {t}
                    {isPersonal ? (
                      <User className="size-3 opacity-80" aria-label="Personal" />
                    ) : (
                      <Building2 className="size-3 opacity-60" aria-label="Workspace" />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {styleGuide && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Style guide
            </p>
            <p className="rounded-xl border border-border/50 bg-muted/25 px-4 py-3 text-sm leading-relaxed text-foreground/90">
              {styleGuide}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          <Layers className="size-3.5 shrink-0" />
          <span>{sourceLabel(voice.source)}</span>
          {termCount > 0 && (
            <>
              <span className="text-border">·</span>
              <span>Custom preferred & avoided terms</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
