"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ExternalLink, History, Pencil, Plus, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import type { EntitySourceMeta, SourceProvider } from "../types/source-meta";
import { getProviderDisplay, getOriginLabel, PROVIDER_DISPLAY } from "../utils/provider-display";
import { MemoryOverviewSection } from "./MemoryOverviewSection";
import { RadixAfterHydration } from "./RadixAfterHydration";
import { SourceHistoryList } from "./SourceHistoryList";
import type { SourceHistoryEntry } from "../queries/source-history";

export type SourcePickerOption = {
  id: string;
  label: string;
  subtitle: string;
  isExtraction?: boolean;
  provider?: SourceProvider;
};

type SourceMetaSectionProps = {
  source: EntitySourceMeta | null | undefined;
  /** Additional links to show (e.g., document URL, capture source) */
  additionalLinks?: Array<{
    label: string;
    url: string;
  }>;
  /** Source history entries showing when and where data came from */
  sourceHistory?: SourceHistoryEntry[];
  /** Enable inline editing */
  editable?: boolean;
  /** Restrict provider picker to these providers (for DB enum constraints) */
  allowedProviders?: SourceProvider[];
  /** Custom source options (e.g. billing separates Salt extraction from manual) */
  sourcePickerOptions?: SourcePickerOption[];
  selectedSourceOptionId?: string;
  onSourceOptionSelect?: (optionId: string) => void;
  /** Callback when source is updated (for editable mode) */
  onUpdate?: (updates: {
    provider?: SourceProvider;
    sourceUrl?: string | null;
  }) => void;
  className?: string;
};

/** Common providers shown first in the picker */
const COMMON_PROVIDERS: SourceProvider[] = [
  "manual",
  "stripe",
  "quickbooks",
  "gmail",
  "google-drive",
  "notion",
  "slack",
];

/** Internal dedupe keys (manual:…) are not user-facing. */
function getDisplayExternalId(
  externalId: string | null | undefined,
  origin: EntitySourceMeta["origin"],
): { label: string; value: string } | null {
  if (!externalId || externalId.startsWith("manual:")) return null;
  return {
    label: origin === "found" ? "External ID" : "Reference",
    value: externalId,
  };
}

function SourceMetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </>
  );
}

/**
 * Displays source/provenance information for a memory record.
 * Shows where the data came from and links to the original resource.
 */
export function SourceMetaSection({
  source,
  additionalLinks,
  sourceHistory,
  editable = false,
  allowedProviders,
  sourcePickerOptions,
  selectedSourceOptionId,
  onSourceOptionSelect,
  onUpdate,
  className,
}: SourceMetaSectionProps) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(source?.sourceUrl ?? "");

  useEffect(() => {
    setUrlDraft(source?.sourceUrl ?? "");
  }, [source?.sourceUrl]);

  if (!source) {
    return null;
  }

  const display = getProviderDisplay(source.provider);
  const selectedPickerOption = sourcePickerOptions?.find(
    (option) => option.id === selectedSourceOptionId,
  );
  const originLabel =
    selectedPickerOption?.subtitle ?? getOriginLabel(source.origin, display.label);
  const hasLinks = source.sourceUrl || (additionalLinks && additionalLinks.length > 0);
  const isExtraction =
    selectedPickerOption?.isExtraction ?? source.origin === "extracted";
  const displayLabel = selectedPickerOption?.label ?? (isExtraction ? "Salt" : display.label);
  const externalIdDisplay = getDisplayExternalId(source.externalId, source.origin);
  const showMetaRows = editable || hasLinks || externalIdDisplay != null;

  const handleProviderChange = (provider: SourceProvider) => {
    setProviderOpen(false);
    onUpdate?.({ provider });
  };

  const handleSourceOptionChange = (optionId: string) => {
    setProviderOpen(false);
    onSourceOptionSelect?.(optionId);
  };

  const handleUrlSave = () => {
    const trimmed = urlDraft.trim();
    onUpdate?.({ sourceUrl: trimmed || null });
    setEditingUrl(false);
  };

  const handleUrlCancel = () => {
    setUrlDraft(source.sourceUrl ?? "");
    setEditingUrl(false);
  };

  const hasMultipleSources = sourceHistory && sourceHistory.length > 0;

  return (
    <MemoryOverviewSection title={hasMultipleSources ? "Sources" : "Source"} variant="heading" id="source-section">
      <div
        className={cn(
          "rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5",
          className,
        )}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <ProviderIcon provider={source.provider} isExtraction={isExtraction} />

          <div className="min-w-0 flex-1">
            {editable ? (
              <RadixAfterHydration
                fallback={
                  <div>
                    <p className="text-sm font-semibold text-foreground">{displayLabel}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {originLabel}
                    </p>
                  </div>
                }
              >
                <Popover open={providerOpen} onOpenChange={setProviderOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="-mx-2 -my-1 flex flex-col items-start rounded-lg px-2 py-1 text-left transition hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                        {displayLabel}
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </span>
                      <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {originLabel}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-1">
                    {sourcePickerOptions && selectedSourceOptionId ? (
                      <SourceOptionPicker
                        options={sourcePickerOptions}
                        current={selectedSourceOptionId}
                        onSelect={handleSourceOptionChange}
                      />
                    ) : (
                      <ProviderPicker
                        current={source.provider}
                        onSelect={handleProviderChange}
                        allowedProviders={allowedProviders}
                      />
                    )}
                  </PopoverContent>
                </Popover>
              </RadixAfterHydration>
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">{displayLabel}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{originLabel}</p>
              </div>
            )}
          </div>
        </div>

        {showMetaRows ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-border/50 pt-4 sm:grid-cols-[minmax(0,6.5rem)_1fr]">
            {editable ? (
              <SourceMetaRow label="Source link">
                {editingUrl ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="url"
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUrlSave();
                        if (e.key === "Escape") handleUrlCancel();
                      }}
                      placeholder="https://..."
                      className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={handleUrlSave}
                      aria-label="Save source link"
                      className="rounded-lg p-1.5 transition hover:bg-muted"
                    >
                      <Check className="size-4 text-success" />
                    </button>
                    <button
                      type="button"
                      onClick={handleUrlCancel}
                      aria-label="Cancel editing source link"
                      className="rounded-lg p-1.5 transition hover:bg-muted"
                    >
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : source.sourceUrl ? (
                  <div className="group inline-flex max-w-full items-center gap-1.5 -mx-1 px-1 py-0.5">
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5 shrink-0" strokeWidth={2} />
                      <span className="truncate group-hover:underline">{source.sourceUrl}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditingUrl(true)}
                      aria-label="Edit source link"
                      className="shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted/40 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingUrl(true)}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg -mx-1 px-1 py-0.5 text-left text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                  >
                    <Plus className="size-3.5 shrink-0" strokeWidth={2} />
                    <span>Add source link</span>
                  </button>
                )}
              </SourceMetaRow>
            ) : null}

            {!editable && source.sourceUrl ? (
              <SourceMetaRow label="Source link">
                <SourceLink
                  url={source.sourceUrl}
                  label={source.sourceLabel ?? `View in ${display.label}`}
                />
              </SourceMetaRow>
            ) : null}

            {!editable &&
              additionalLinks?.map((link) => (
                <SourceMetaRow key={link.url} label="Attachment">
                  <SourceLink url={link.url} label={link.label} />
                </SourceMetaRow>
              ))}

            {editable &&
              additionalLinks?.map((link) => (
                <SourceMetaRow key={link.url} label="Attachment">
                  <SourceLink url={link.url} label={link.label} />
                </SourceMetaRow>
              ))}

            {externalIdDisplay ? (
              <SourceMetaRow label={externalIdDisplay.label}>
                <code className="inline-block max-w-full truncate rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                  {externalIdDisplay.value}
                </code>
              </SourceMetaRow>
            ) : null}
          </dl>
        ) : null}

        {sourceHistory && sourceHistory.length > 0 ? (
          <div className="mt-4 border-t border-border/50 pt-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-medium text-muted-foreground">
              <History className="size-3.5" />
              <span>All sources ({sourceHistory.length})</span>
            </div>
            <SourceHistoryList history={sourceHistory} maxItems={10} />
          </div>
        ) : null}
      </div>
    </MemoryOverviewSection>
  );
}

function ProviderIcon({ provider, isExtraction }: { provider: SourceProvider; isExtraction: boolean }) {
  const display = getProviderDisplay(provider);

  if (display.iconSrc) {
    return (
      <div
        className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-card shrink-0"
        style={{ backgroundColor: `${display.color}10` }}
      >
        <Image
          src={display.iconSrc}
          alt={display.label}
          width={20}
          height={20}
          className="size-5 object-contain"
        />
      </div>
    );
  }

  if (isExtraction) {
    return (
      <div className="flex size-8 items-center justify-center rounded-lg border border-flame/30 bg-flame/10 shrink-0">
        <Sparkles className="size-4 text-flame" strokeWidth={2.25} />
      </div>
    );
  }

  return (
    <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted shrink-0">
      <Plus className="size-4 text-muted-foreground" strokeWidth={2} />
    </div>
  );
}

function SourceOptionPicker({
  options,
  current,
  onSelect,
}: {
  options: SourcePickerOption[];
  current: string;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
            option.id === current ? "bg-muted" : "hover:bg-muted/50",
          )}
        >
          {option.isExtraction ? (
            <Sparkles className="size-4 shrink-0 text-flame" strokeWidth={2.25} />
          ) : option.provider && getProviderDisplay(option.provider).iconSrc ? (
            <Image
              src={getProviderDisplay(option.provider).iconSrc!}
              alt={option.label}
              width={16}
              height={16}
              className="size-4 object-contain"
            />
          ) : (
            <div className="size-4 shrink-0" />
          )}
          <span className="flex-1 text-left">{option.label}</span>
          {option.id === current ? <Check className="size-4 text-foreground" /> : null}
        </button>
      ))}
    </div>
  );
}

function ProviderPicker({
  current,
  onSelect,
  allowedProviders,
}: {
  current: SourceProvider;
  onSelect: (provider: SourceProvider) => void;
  allowedProviders?: SourceProvider[];
}) {
  const allProviders = Object.keys(PROVIDER_DISPLAY) as SourceProvider[];

  // If allowedProviders is specified, only show those
  if (allowedProviders && allowedProviders.length > 0) {
    return (
      <div className="max-h-64 overflow-y-auto">
        {allowedProviders.map((provider) => (
          <ProviderOption
            key={provider}
            provider={provider}
            selected={provider === current}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  // Otherwise show common + all
  const otherProviders = allProviders.filter((p) => !COMMON_PROVIDERS.includes(p));

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Common
      </div>
      {COMMON_PROVIDERS.map((provider) => (
        <ProviderOption
          key={provider}
          provider={provider}
          selected={provider === current}
          onSelect={onSelect}
        />
      ))}
      <div className="my-1 border-t border-border/40" />
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        All providers
      </div>
      {otherProviders.map((provider) => (
        <ProviderOption
          key={provider}
          provider={provider}
          selected={provider === current}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ProviderOption({
  provider,
  selected,
  onSelect,
}: {
  provider: SourceProvider;
  selected: boolean;
  onSelect: (provider: SourceProvider) => void;
}) {
  const display = getProviderDisplay(provider);

  return (
    <button
      type="button"
      onClick={() => onSelect(provider)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
        selected ? "bg-muted" : "hover:bg-muted/50"
      )}
    >
      {display.iconSrc ? (
        <Image
          src={display.iconSrc}
          alt={display.label}
          width={16}
          height={16}
          className="size-4 object-contain"
        />
      ) : (
        <div className="size-4" />
      )}
      <span className="flex-1 text-left">{display.label}</span>
      {selected && <Check className="size-4 text-foreground" />}
    </button>
  );
}

function SourceLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        "hover:text-foreground transition-colors"
      )}
    >
      <ExternalLink className="size-3.5 shrink-0" strokeWidth={2} />
      <span className="truncate group-hover:underline">{label}</span>
    </a>
  );
}

/**
 * Compact inline source display for use in property rows.
 * Shows provider icon + name without the full section wrapper.
 */
export function SourceMetaInline({
  source,
  className,
}: {
  source: EntitySourceMeta | null | undefined;
  className?: string;
}) {
  if (!source) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const display = getProviderDisplay(source.provider);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {display.iconSrc ? (
        <Image
          src={display.iconSrc}
          alt={display.label}
          width={16}
          height={16}
          className="size-4 object-contain"
        />
      ) : null}
      <span className="text-sm text-foreground">{display.label}</span>
      {source.sourceUrl && (
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-3.5" strokeWidth={2} />
        </a>
      )}
    </div>
  );
}
