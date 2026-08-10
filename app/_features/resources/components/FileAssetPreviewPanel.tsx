"use client";

import type { LucideIcon } from "lucide-react";
import { ExternalLink } from "lucide-react";

type FileAssetPreviewPanelProps = {
  icon: LucideIcon;
  title: string;
  openLabel?: string;
  onOpen?: () => void;
};

export function FileAssetPreviewPanel({
  icon: Icon,
  title,
  openLabel,
  onOpen,
}: FileAssetPreviewPanelProps) {
  return (
    <div className="flex max-w-lg flex-col items-center px-6 text-center">
      <div className="grid size-16 place-items-center rounded-2xl border border-border/50 bg-background shadow-sm">
        <Icon className="size-7 text-foreground/70" strokeWidth={1.75} />
      </div>

      <h3 className="mt-5 font-display text-2xl tracking-tight text-foreground sm:text-[1.75rem]">
        {title}
      </h3>

      {openLabel && onOpen ? (
        <div className="mt-8 flex max-w-md flex-col items-center">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex max-w-full items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            <span>{openLabel}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
