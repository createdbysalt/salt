"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Search } from "lucide-react";
import { PhoneInput } from "@repo/ui";
import type { Country } from "react-phone-number-input";
import {
  CalendarPanel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  calendarPopoverClassName,
  parseFlexibleDate,
  parseIsoDate,
  toIsoDate,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import {
  formatPhoneForDisplay,
  getPhoneDefaultCountry,
  normalizePhoneForStorage,
} from "@/app/_features/memory/utils/phone-format";
import type { RecordStatus } from "@/app/_lib/demo/people-demo-data";
import {
  getVocabularyOptions,
  type RelationshipType,
} from "@/app/_features/memory/taxonomy/registry";
import { formatTimezoneLabel } from "@/app/_features/memory/utils/timezone-format";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";

export const TIMEZONE_OPTIONS = getVocabularyOptions("timezone");

export function timezoneSelectOptions(currentValue?: string | null) {
  const options: { value: string; label: string }[] = [
    { value: "", label: "Select timezone" },
    ...TIMEZONE_OPTIONS,
  ];
  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({
      value: currentValue,
      label: formatTimezoneLabel(currentValue) ?? currentValue,
    });
  }
  return options;
}

export const RECORD_STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** Person-scoped relationship options (all 9 canon values). */
export const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] =
  getVocabularyOptions("relationship_type", "person").map((opt) => ({
    value: opt.value as RelationshipType,
    label: opt.label,
  }));

/** Org-scoped relationship options — hides person-only values (team, personal). */
export const ORG_RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] =
  getVocabularyOptions("relationship_type", "org").map((opt) => ({
    value: opt.value as RelationshipType,
    label: opt.label,
  }));

export const RETAINER_OPTIONS = [
  { value: "Care", label: "Care" },
  { value: "Essential", label: "Essential" },
  { value: "Growth", label: "Growth" },
  { value: "Scale", label: "Scale" },
] as const;

export const RETAINER_SELECT_OPTIONS = [
  { value: "", label: "Add retainer" },
  ...RETAINER_OPTIONS.map((r) => ({ value: r.value, label: r.label })),
];

const inlineFieldBase =
  "text-left text-sm rounded-lg -mx-1 px-1 py-0.5 max-w-full transition hover:bg-muted/40";

export function AccountRow({ label, children, id }: { label: string; children: React.ReactNode; id?: string }) {
  return (
    <>
      <dt id={id} className="text-muted-foreground pt-0.5">{label}</dt>
      <dd className="text-foreground min-w-0">{children}</dd>
    </>
  );
}

export function InlineEditableText({
  value,
  onChange,
  placeholder = "Add…",
  linkHref,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  linkHref?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        placeholder={placeholder}
        className={cn(
          "w-full min-w-[8rem] bg-transparent border-0 border-b border-foreground/25 px-1 py-0.5 text-sm text-foreground focus:outline-none focus:border-foreground/60",
          className
        )}
      />
    );
  }

  const display = value || placeholder;
  const isEmpty = !value;

  if (linkHref && value) {
    // User-provided values can carry javascript:/data: schemes — only render
    // a link for validated http(s) URLs or app-internal paths.
    const externalHref = safeHttpUrl(linkHref);
    const internalHref =
      !externalHref && linkHref.startsWith("/") && !linkHref.startsWith("//")
        ? linkHref
        : null;

    return (
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            inlineFieldBase,
            "min-w-0 truncate font-medium text-flame underline decoration-flame/35 underline-offset-2 hover:decoration-flame",
            className,
          )}
          title="Click to edit"
        >
          {display}
        </button>
        {externalHref ? (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            aria-label="Open link"
            title="Open link"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : internalHref ? (
          <Link
            href={internalHref}
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            aria-label="Open link"
            title="Open link"
          >
            <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        inlineFieldBase,
        isEmpty ? "text-muted-foreground/80 italic" : "text-foreground",
        className
      )}
    >
      {display}
    </button>
  );
}

export function InlineEditablePhone({
  value,
  onChange,
  placeholder = "Add phone number",
  className,
  defaultCountry = "US",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  defaultCountry?: Country;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const normalized = normalizePhoneForStorage(draft, defaultCountry);
    onChange(normalized);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className={cn("min-w-0 max-w-full", className)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
          }
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
      >
        <PhoneInput
          autoFocus
          variant="inline"
          value={draft || undefined}
          defaultCountry={getPhoneDefaultCountry(draft || value, defaultCountry)}
          onChange={(next) => setDraft(next ?? "")}
          className="w-full max-w-full"
        />
      </div>
    );
  }

  const display = value ? formatPhoneForDisplay(value, defaultCountry) : placeholder;
  const isEmpty = !value;

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        inlineFieldBase,
        isEmpty ? "text-muted-foreground/80 italic" : "text-foreground",
        className,
      )}
    >
      {display}
    </button>
  );
}

export function InlineSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  popoverClassName,
  open: controlledOpen,
  onOpenChange,
  searchPlaceholder = "Search…",
  variant = "inline",
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchPlaceholder?: string;
  /** `inline` = memory row style; `field` = full-width form control matching Input */
  variant?: "inline" | "field";
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const open = controlledOpen ?? internalOpen;
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;
  const isEmpty = !selected || !value;
  const showSearch = options.length >= 20;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    const query = search.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query),
    );
  }, [options, search, showSearch]);

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

  const handleSelect = (nextValue: T) => {
    onChange(nextValue);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      className={cn(
        variant === "field"
          ? cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-[color,box-shadow] outline-none hover:bg-muted/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30",
              isEmpty ? "text-muted-foreground" : "text-foreground",
            )
          : cn(
              "inline-flex items-center gap-0.5 rounded-lg -mx-1 px-1 py-0.5 text-sm transition hover:bg-muted/40",
              isEmpty ? "text-muted-foreground/80 italic" : "text-foreground",
            ),
        className,
      )}
    >
      <span className="min-w-0 truncate text-left">{label}</span>
      <ChevronDown
        className={cn(
          "shrink-0 text-muted-foreground",
          variant === "field" ? "size-4 opacity-70" : "size-3 opacity-35",
        )}
        strokeWidth={2.25}
      />
    </button>
  );

  return (
    <RadixAfterHydration fallback={trigger}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className={cn(
            variant === "field"
              ? "w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] gap-0 p-2"
              : "w-auto min-w-[10rem] max-w-[min(16rem,calc(100vw-2rem))] gap-0 p-2",
            popoverClassName,
          )}
        >
          {showSearch ? (
            <div className="relative mb-2">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-full border border-border/60 bg-card/60 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 transition"
                autoFocus
              />
            </div>
          ) : null}

          <div className="max-h-60 overflow-y-auto overscroll-contain">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">No matches</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "relative flex w-full items-center rounded-xl px-2.5 py-2 text-sm text-left transition hover:bg-muted/60",
                      isSelected && "bg-primary/10 text-primary",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {isSelected ? (
                      <Check className="ml-2 size-4 shrink-0 text-primary" strokeWidth={2.25} />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </RadixAfterHydration>
  );
}

export function RecordStatusControl({
  value,
  onChange,
  className,
}: {
  value: RecordStatus;
  onChange: (status: RecordStatus) => void;
  className?: string;
}) {
  return (
    <InlineSelect
      value={value}
      onChange={onChange}
      options={RECORD_STATUS_OPTIONS}
      className={className}
    />
  );
}

export function InlineDatePicker({
  value,
  onChange,
  placeholder = "Add date",
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const selected = parseIsoDate(value);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const isEmpty = !value;
  const displayValue = selected
    ? selected.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? toIsoDate(date) : null);
    if (date) setOpen(false);
  };

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange(null);
    } else {
      const parsed = parseFlexibleDate(trimmed);
      if (parsed) {
        onChange(toIsoDate(parsed));
      } else {
        setDraft(value ?? "");
      }
    }
    setEditing(false);
  };

  const cancelDraft = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitDraft();
          if (e.key === "Escape") cancelDraft();
        }}
        placeholder="YYYY-MM-DD"
        aria-label="Date"
        className={cn(
          "w-full min-w-[8rem] bg-transparent border-0 border-b border-foreground/25 px-1 py-0.5 text-sm text-foreground focus:outline-none focus:border-foreground/60",
          className
        )}
      />
    );
  }

  const trigger = (
    <button
      type="button"
      onDoubleClick={(e) => {
        e.preventDefault();
        setOpen(false);
        setEditing(true);
      }}
      title="Click for calendar · Double-click to type"
      className={cn(
        inlineFieldBase,
        isEmpty ? "text-muted-foreground/80 italic" : "text-foreground",
        className
      )}
    >
      {displayValue}
    </button>
  );

  return (
    <RadixAfterHydration fallback={trigger}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className={calendarPopoverClassName}>
          <CalendarPanel selected={selected} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    </RadixAfterHydration>
  );
}

export function InlineNumber({
  value,
  onChange,
  placeholder = "Add number",
  min,
  max,
  step = "1",
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const parsed = draft.trim() ? Number.parseFloat(draft) : null;
    onChange(Number.isFinite(parsed) ? parsed : null);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value == null ? "" : String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className={cn(
          "w-full min-w-[8rem] bg-transparent border-0 border-b border-foreground/25 px-1 py-0.5 text-sm text-foreground focus:outline-none focus:border-foreground/60",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        inlineFieldBase,
        value == null ? "text-muted-foreground/80 italic" : "text-foreground tabular-nums",
        className
      )}
    >
      {value == null ? placeholder : value}
    </button>
  );
}

export function InlineMoney({
  valueCents,
  onChange,
  currency = "USD",
  placeholder = "Add amount",
  className,
}: {
  valueCents: number | null;
  onChange: (valueCents: number | null) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(valueCents == null ? "" : String(valueCents / 100));

  useEffect(() => {
    setDraft(valueCents == null ? "" : String(valueCents / 100));
  }, [valueCents]);

  const commit = () => {
    const parsed = draft.trim() ? Number.parseFloat(draft) : null;
    onChange(parsed == null || !Number.isFinite(parsed) ? null : Math.round(parsed * 100));
    setEditing(false);
  };

  const cancel = () => {
    setDraft(valueCents == null ? "" : String(valueCents / 100));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        min={0}
        step="0.01"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className={cn(
          "w-full min-w-[8rem] bg-transparent border-0 border-b border-foreground/25 px-1 py-0.5 text-sm text-foreground focus:outline-none focus:border-foreground/60",
          className
        )}
      />
    );
  }

  const display =
    valueCents == null
      ? placeholder
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(valueCents / 100);

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        inlineFieldBase,
        valueCents == null ? "text-muted-foreground/80 italic" : "text-foreground tabular-nums",
        className
      )}
    >
      {display}
    </button>
  );
}

export function ReadOnlyDerivedValue({
  children,
  empty = false,
  className,
}: {
  children: React.ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-sm",
        empty ? "text-muted-foreground/70 italic" : "text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
