"use client";

import Image from "next/image";
import { FileText, Sparkles } from "lucide-react";
import { cn } from "@repo/utils";
import type { BillingProvider } from "../data";
import {
  getBillingSourceDisplay,
  type BillingSourceAttribution,
} from "../utils/provider-display";

type BillingSourceBadgeProps = BillingSourceAttribution & {
  className?: string;
  compact?: boolean;
};

export function BillingSourceBadge({
  provider,
  source,
  origin,
  sourceReclassifiedAsManual,
  className,
  compact = false,
}: BillingSourceBadgeProps) {
  const display = getBillingSourceDisplay({
    provider,
    source,
    origin,
    sourceReclassifiedAsManual,
  });

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2 py-1 text-xs font-medium text-foreground/80",
        className,
      )}
    >
      <span className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/8">
        {display.iconSrc ? (
          <Image src={display.iconSrc} alt="" width={16} height={16} className="size-4 object-contain" />
        ) : display.isSalt ? (
          <Sparkles className="size-3 text-flame" strokeWidth={2.25} />
        ) : (
          <FileText className="size-3 text-muted-foreground" strokeWidth={2.25} />
        )}
      </span>
      {!compact ? <span className="truncate">{display.label}</span> : null}
    </span>
  );
}
