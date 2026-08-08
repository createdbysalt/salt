"use client";

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

interface ToolApprovalToggleProps {
  label: string;
  requiresApproval: boolean;
  isDestructive?: boolean;
  onChange: (requiresApproval: boolean) => void;
}

/**
 * Approval toggle for Trust mode. Destructive tools are always required
 * (locked state, cannot be changed).
 */
function ToolApprovalToggle({
  label,
  requiresApproval,
  isDestructive,
  onChange,
}: ToolApprovalToggleProps) {
  if (isDestructive) {
    return (
      <span
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-600"
        title="Destructive actions always require approval"
      >
        Always asks
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={requiresApproval}
      aria-label={`Require approval for ${label}`}
      onClick={() => onChange(!requiresApproval)}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
        requiresApproval
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
      )}
    >
      {requiresApproval ? "Asks" : "Auto"}
    </button>
  );
}

interface ToolCategorySectionProps {
  category: ToolCategoryKind;
  capabilities: ConnectorCapability[];
  /** Trust mode: show per-tool approval toggles */
  trustMode?: boolean;
  /** Per-tool approval overrides (only shown in Trust mode) */
  toolApprovalOverrides?: Record<string, boolean>;
  /** Callback when user changes a tool's approval requirement */
  onToolApprovalChange?: (toolSlug: string, requiresApproval: boolean) => void;
}

export function ToolCategorySection({
  category,
  capabilities,
  trustMode = false,
  toolApprovalOverrides = {},
  onToolApprovalChange,
}: ToolCategorySectionProps) {
  if (capabilities.length === 0) {
    return null;
  }

  const meta = CATEGORY_META[category];

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
      </div>

      <ul className="divide-y divide-border/40 px-4">
        {capabilities.map((capability) => {
          const toolSlug = capability.toolSlug;
          const isDestructive = category === "write";
          const requiresApproval = toolSlug
            ? isDestructive || toolApprovalOverrides[toolSlug] === true
            : false;

          return (
            <li
              key={capability.id}
              className={cn(
                "items-center gap-4 py-2.5 grid",
                trustMode
                  ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  : "grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]",
              )}
            >
              <p className="text-sm text-foreground">{capability.label}</p>
              <p className="text-sm text-muted-foreground">
                {capability.description ?? "—"}
              </p>
              {trustMode && toolSlug ? (
                <ToolApprovalToggle
                  label={capability.label}
                  requiresApproval={requiresApproval}
                  isDestructive={isDestructive}
                  onChange={(required) => onToolApprovalChange?.(toolSlug, required)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
