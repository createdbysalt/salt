"use client";

import type { LucideIcon } from "lucide-react";
import { ExternalLink } from "lucide-react";

type FileAssetPreviewPanelProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  openLabel?: string;
  openHint?: string;
  onOpen?: () => void;
};

export function FileAssetPreviewPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  openLabel,
  openHint,
  onOpen,
}: FileAssetPreviewPanelProps) {
  return (
    <div className="flex max-w-lg flex-col items-center px-6 text-center">
      <div className="grid size-16 place-items-center rounded-2xl border border-border/50 bg-background shadow-sm">
        <Icon className="size-7 text-foreground/70" strokeWidth={1.75} />
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {eyebrow}
      </p>

      <h3 className="mt-2 font-display text-2xl tracking-tight text-foreground sm:text-[1.75rem]">
        {title}
      </h3>

      {description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {openLabel && onOpen ? (
        <div className="mt-8 flex max-w-md flex-col items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex max-w-full items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            <span>{openLabel}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </button>
          {openHint ? (
            <p className="max-w-full truncate text-xs text-muted-foreground" title={openHint}>
              {openHint}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
