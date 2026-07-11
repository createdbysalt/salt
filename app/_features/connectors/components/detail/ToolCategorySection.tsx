"use client";

import { ChevronDown } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { ConnectorCapability } from "@/app/_features/connectors";

export type ToolCategoryKind = "read" | "write";

const CATEGORY_META: Record<
  ToolCategoryKind,
  { label: string; headerClass: string; dotClass: string }
> = {
  read: {
    label: "Read-only tools",
    headerClass: "border-border/50 bg-muted/30",
    dotClass: "bg-muted-foreground/50",
  },
  write: {
    label: "Write / delete tools",
    headerClass: "border-amber-500/25 bg-amber-500/[0.07]",
    dotClass: "bg-amber-500",
  },
};

export function filterCapabilities(
  capabilities: ConnectorCapability[],
  query: string,
): ConnectorCapability[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return capabilities;
  }

  return capabilities.filter(
    (capability) =>
      capability.label.toLowerCase().includes(normalized) ||
      capability.description?.toLowerCase().includes(normalized),
  );
}

function bulkCategoryState(
  capabilities: ConnectorCapability[],
  disabledTools: string[],
): "allow" | "disable" | "mixed" {
  const slugs = capabilities
    .map((capability) => capability.toolSlug)
    .filter((slug): slug is string => Boolean(slug));

  if (slugs.length === 0) {
    return "allow";
  }

  const disabledCount = slugs.filter((slug) => disabledTools.includes(slug)).length;
  if (disabledCount === 0) {
    return "allow";
  }
  if (disabledCount === slugs.length) {
    return "disable";
  }
  return "mixed";
}

interface ToolAllowToggleProps {
  /** Accessible name for the toggle group — the tool's display label. */
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Allow/Disable segmented control for one tool. Uses the radiogroup/radio
 * pattern so every toggle carries an accessible name (aria-label = tool
 * label) instead of shipping dozens of unnamed buttons.
 */
function ToolAllowToggle({ label, enabled, disabled, onChange }: ToolAllowToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex shrink-0 rounded-lg bg-muted/40 p-0.5",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={!enabled}
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          !enabled
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Disable
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          enabled
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Allow
      </button>
    </div>
  );
}

interface ToolCategorySectionProps {
  category: ToolCategoryKind;
  capabilities: ConnectorCapability[];
  disabledTools: string[];
  canManageTools: boolean;
  controlsDisabled: boolean;
  /** Pre-connect preview: render the rows without any toggle controls. */
  readOnly?: boolean;
  onBulkChange: (slugs: string[], enabled: boolean) => void;
  onToolChange: (toolSlug: string, enabled: boolean) => void;
}

export function ToolCategorySection({
  category,
  capabilities,
  disabledTools,
  canManageTools,
  controlsDisabled,
  readOnly = false,
  onBulkChange,
  onToolChange,
}: ToolCategorySectionProps) {
  if (capabilities.length === 0) {
    return null;
  }

  const meta = CATEGORY_META[category];
  const slugs = capabilities
    .map((capability) => capability.toolSlug)
    .filter((slug): slug is string => Boolean(slug));
  const bulkState = bulkCategoryState(capabilities, disabledTools);
  const bulkLabel =
    bulkState === "mixed" ? "Mixed" : bulkState === "allow" ? "Allow" : "Disable";

  return (
    <section className="overflow-hidden rounded-xl border border-border/50">
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          meta.headerClass,
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", meta.dotClass)}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              {meta.label}
            </h4>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/80 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/50">
              {capabilities.length}
            </span>
          </div>
        </div>
        {!readOnly && slugs.length > 0 && canManageTools ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 rounded-lg border-border/60 bg-background/80 px-2.5 text-xs"
                disabled={controlsDisabled}
                aria-label={`${meta.label}: bulk allow or disable`}
              >
                {bulkLabel}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onBulkChange(slugs, true)}>
                Allow all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkChange(slugs, false)}>
                Disable all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <ul className="divide-y divide-border/40 px-4">
        {capabilities.map((capability) => {
          const toolSlug = capability.toolSlug;
          const enabled = toolSlug ? !disabledTools.includes(toolSlug) : true;
          const rowControlsDisabled =
            controlsDisabled || !toolSlug || !canManageTools;

          return (
            <li
              key={capability.id}
              className={cn(
                "items-center gap-4 py-2.5",
                readOnly
                  ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
                  : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]",
              )}
            >
              <p className="text-sm text-foreground">{capability.label}</p>
              <p className="text-sm text-muted-foreground">
                {capability.description ?? "—"}
              </p>
              {readOnly ? null : toolSlug ? (
                <ToolAllowToggle
                  label={capability.label}
                  enabled={enabled}
                  disabled={rowControlsDisabled}
                  onChange={(nextEnabled) => onToolChange(toolSlug, nextEnabled)}
                />
              ) : (
                <span className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                  Included
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
