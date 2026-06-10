"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { Settings2, Check } from "lucide-react";
import { cn } from "@repo/utils";

export type CaptureDisplayOptions = {
  showUpNext: boolean;
};

export const DEFAULT_CAPTURE_DISPLAY: CaptureDisplayOptions = {
  showUpNext: true,
};

type Props = {
  value: CaptureDisplayOptions;
  onChange: (next: CaptureDisplayOptions) => void;
};

const PANEL_TOGGLES: { key: keyof CaptureDisplayOptions; label: string; hint: string }[] = [
  { key: "showUpNext", label: "Up next rail", hint: "Side list of pending captures" },
];

export function CaptureDisplayPopover({ value, onChange }: Props) {
  function toggle(key: keyof CaptureDisplayOptions) {
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 text-[13px] font-medium text-foreground/80 transition-all hover:border-border"
        >
          <Settings2 className="size-3.5" strokeWidth={2} />
          Display
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl border-border/60 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Beside the card
        </p>
        <div className="space-y-1">
          {PANEL_TOGGLES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition",
                value[t.key] ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-md border transition",
                  value[t.key]
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/70 bg-card text-transparent"
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-tight">{t.label}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                  {t.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
