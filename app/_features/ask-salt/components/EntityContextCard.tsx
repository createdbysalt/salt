"use client";

import * as React from "react";
import Link from "next/link";
import type { EntityContext } from "../types/entity-context";
import { ENTITY_TYPE_CONFIG } from "../utils/entity-adapters";
import { cn } from "@repo/utils";

interface EntityContextCardProps {
  context: EntityContext;
  className?: string;
}

/**
 * Unified context card for Ask Salt.
 * Renders any entity type with consistent visual treatment.
 * Displayed as a user message in the chat stream.
 */
export function EntityContextCard({ context, className }: EntityContextCardProps) {
  const config = ENTITY_TYPE_CONFIG[context.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-xl",
            config.color
          )}
        >
          <Icon
            className={cn(
              "size-3.5",
              config.color === "surface-aurora"
                ? "relative z-10 text-white"
                : "text-foreground/70"
            )}
            strokeWidth={config.color === "surface-aurora" ? 2.5 : 2.25}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            {context.actionLabel}
          </p>
          <p className="mt-0.5 truncate text-[13.5px] font-semibold leading-snug tracking-tight">
            {context.title}
          </p>
          {context.subtitle && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              {context.subtitle}
            </p>
          )}
          {context.details && context.details.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {context.details.map((detail, i) => (
                <span
                  key={i}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {detail}
                </span>
              ))}
            </div>
          )}
        </div>
        {context.href && (
          <Link
            href={context.href}
            className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
