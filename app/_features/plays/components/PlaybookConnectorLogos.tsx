"use client";

import { cn } from "@repo/utils";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";

/** Display labels that differ from the humanized catalog id. */
const LABEL_OVERRIDES: Partial<Record<ConnectorCatalogId, string>> = {
  google: "Gmail",
  "google-calendar": "Google Calendar",
  "google-docs": "Google Docs",
  "google-drive": "Google Drive",
};

function humanizeId(id: string): string {
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Overlapping connector logos for the apps a playbook touches — the same
 * cluster treatment as the prototype's AppLogoCluster. Glyphs come from
 * ConnectorIcon (Simple Icons with Brandfetch PNG fallback).
 */
export function PlaybookConnectorLogos({
  ids,
  className,
}: {
  ids: readonly ConnectorCatalogId[];
  className?: string;
}) {
  if (ids.length === 0) return null;

  return (
    <div className={cn("flex items-center -space-x-1.5 shrink-0", className)}>
      {ids.map((id) => (
        <span
          key={id}
          title={LABEL_OVERRIDES[id] ?? humanizeId(id)}
          className="size-7 inline-flex items-center justify-center rounded-full bg-card border border-border/60 shadow-sm ring-2 ring-card transition-transform hover:-translate-y-0.5 hover:z-10"
        >
          <ConnectorIcon id={id} size={14} />
        </span>
      ))}
    </div>
  );
}
