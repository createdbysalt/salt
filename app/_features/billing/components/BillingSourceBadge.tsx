"use client";

import Image from "next/image";
import { FileText } from "lucide-react";
import { cn } from "@repo/utils";
import type { BillingProvider } from "../data";
import { getBillingProviderDisplay } from "../utils/provider-display";

type BillingSourceBadgeProps = {
  provider: BillingProvider;
  className?: string;
  compact?: boolean;
};

export function BillingSourceBadge({ provider, className, compact = false }: BillingSourceBadgeProps) {
  const display = getBillingProviderDisplay(provider);

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
        ) : (
          <FileText className="size-3 text-muted-foreground" strokeWidth={2.25} />
        )}
      </span>
      {!compact ? <span className="truncate">{display.label}</span> : null}
    </span>
  );
}
