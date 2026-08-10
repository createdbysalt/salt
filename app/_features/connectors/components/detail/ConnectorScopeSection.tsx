"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import {
  GMAIL_CATEGORIES,
  scopeKindForProvider,
  type CaptureScope,
  type CaptureScopeOption,
  type GmailCategory,
} from "@/app/_lib/composio/capture-scope";
import {
  listCaptureScopeOptions,
  updateConnectorCaptureScope,
} from "../../actions/capture-scope";

/**
 * Per-connection capture scoping (Sources plan 4.5).
 *
 * Lives on the connector's own detail pane, directly under Memory capture —
 * the decision was no separate Sources → Rules tab. Each control writes the
 * connection's trigger_config through the 4.2 upsert wrapper, so a choice
 * here cuts delivered (billed) events upstream, not after the fact.
 */

const GMAIL_CATEGORY_LABELS: Record<GmailCategory, string> = {
  promotions: "Promotions",
  social: "Social",
  updates: "Updates",
  forums: "Mailing lists",
};

const SELECT_COPY: Record<
  Exclude<CaptureScope["kind"], "gmail_categories">,
  { allLabel: string; pickerLabel: string; blurb: string }
> = {
  slack_channel: {
    allLabel: "Every channel",
    pickerLabel: "Channel",
    blurb:
      "Salt learns from every channel. Narrow to one if the rest is noise — direct messages always come through.",
  },
  calendar: {
    allLabel: "Primary calendar",
    pickerLabel: "Calendar",
    blurb: "New events feed your Memory. Pick the calendar that matters.",
  },
  drive_folder: {
    allLabel: "Your whole Drive",
    pickerLabel: "Folder",
    blurb: "New files feed your Memory. Narrow to one folder to skip the rest.",
  },
};

export function ConnectorScopeSection({
  provider,
  scope,
  onChanged,
}: {
  provider: string;
  scope: CaptureScope | null;
  onChanged: () => void;
}) {
  const kind = scopeKindForProvider(provider);
  if (!kind) return null;

  return (
    <section className="space-y-2.5">
      <h3 className="text-sm font-semibold text-foreground">What Salt watches</h3>
      {kind === "gmail_categories" ? (
        <GmailCategoryScope provider={provider} scope={scope} onChanged={onChanged} />
      ) : (
        <ScopeSelect provider={provider} kind={kind} scope={scope} onChanged={onChanged} />
      )}
    </section>
  );
}

function ScopeSelect({
  provider,
  kind,
  scope,
  onChanged,
}: {
  provider: string;
  kind: Exclude<CaptureScope["kind"], "gmail_categories">;
  scope: CaptureScope | null;
  onChanged: () => void;
}) {
  const copy = SELECT_COPY[kind];
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<CaptureScopeOption[] | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [localScope, setLocalScope] = React.useState<CaptureScope | null>(scope);

  React.useEffect(() => {
    setLocalScope(scope);
  }, [scope]);

  // Options load lazily the first time the picker opens — a metered read
  // call shouldn't fire for panes that never touch scoping.
  React.useEffect(() => {
    if (!open || options !== null || loadFailed) return;
    let cancelled = false;
    void listCaptureScopeOptions({ provider }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setOptions(result.options);
      } else {
        setLoadFailed(true);
        toast.error(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, options, loadFailed, provider]);

  const select = async (next: CaptureScope | null) => {
    const previous = localScope;
    setLocalScope(next);
    setSaving(true);
    setOpen(false);
    const result = await updateConnectorCaptureScope({ provider, scope: next });
    setSaving(false);
    if (result.success) {
      onChanged();
    } else {
      setLocalScope(previous);
      toast.error(result.error);
    }
  };

  const currentLabel =
    localScope && localScope.kind === kind ? localScope.label : copy.allLabel;

  const buildScope = (option: CaptureScopeOption): CaptureScope => {
    switch (kind) {
      case "slack_channel":
        return { kind, channelId: option.id, label: option.label };
      case "calendar":
        return { kind, calendarId: option.id, label: option.label };
      case "drive_folder":
        return { kind, folderId: option.id, label: option.label };
    }
  };

  const isActive = (option: CaptureScopeOption): boolean => {
    if (!localScope || localScope.kind !== kind) return false;
    switch (localScope.kind) {
      case "slack_channel":
        return localScope.channelId === option.id;
      case "calendar":
        return localScope.calendarId === option.id;
      case "drive_folder":
        return localScope.folderId === option.id;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={saving}
              aria-label={`Choose ${copy.pickerLabel.toLowerCase()}`}
              className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground transition hover:border-border disabled:opacity-50"
            >
              <span className="truncate">{currentLabel}</span>
              {saving ? (
                <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {copy.pickerLabel}
            </p>
            <ScopeOption
              label={copy.allLabel}
              active={localScope === null}
              onSelect={() => void select(null)}
            />
            {options === null ? (
              <p className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </p>
            ) : options.length === 0 ? (
              <p className="px-2.5 py-1.5 text-sm text-muted-foreground">
                Nothing found on this account.
              </p>
            ) : (
              options.map((option) => (
                <ScopeOption
                  key={option.id}
                  label={option.label}
                  active={isActive(option)}
                  onSelect={() => void select(buildScope(option))}
                />
              ))
            )}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{copy.blurb}</p>
    </div>
  );
}

function ScopeOption({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition hover:bg-muted/60",
        active ? "font-medium text-foreground" : "text-foreground/80",
      )}
    >
      <span className="truncate">{label}</span>
      {active ? <Check className="size-4 shrink-0" strokeWidth={2.5} /> : null}
    </button>
  );
}

function GmailCategoryScope({
  provider,
  scope,
  onChanged,
}: {
  provider: string;
  scope: CaptureScope | null;
  onChanged: () => void;
}) {
  const [saving, setSaving] = React.useState(false);

  // Null scope = the seeded default: every category excluded.
  const excluded: readonly GmailCategory[] =
    scope?.kind === "gmail_categories" ? scope.excluded : GMAIL_CATEGORIES;

  const toggle = async (category: GmailCategory) => {
    const nextExcluded = excluded.includes(category)
      ? excluded.filter((c) => c !== category)
      : [...excluded, category];
    const next: CaptureScope = {
      kind: "gmail_categories",
      excluded: GMAIL_CATEGORIES.filter((c) => nextExcluded.includes(c)),
    };
    setSaving(true);
    const result = await updateConnectorCaptureScope({ provider, scope: next });
    setSaving(false);
    if (result.success) {
      onChanged();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {GMAIL_CATEGORIES.map((category) => {
          const included = !excluded.includes(category);
          return (
            <button
              key={category}
              type="button"
              role="switch"
              aria-checked={included}
              disabled={saving}
              onClick={() => void toggle(category)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                included
                  ? "border-foreground/20 bg-muted text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {GMAIL_CATEGORY_LABELS[category]}
            </button>
          );
        })}
        {saving ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        Salt skips these categories by default. Turn one on only if it carries
        real work — everything else is filtered out before it reaches Salt.
      </p>
    </div>
  );
}
