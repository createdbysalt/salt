"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import type { RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";
import {
  RELATIONSHIP_TYPE_LABELS,
  getVocabularyOptions,
} from "@/app/_features/memory/taxonomy/registry";

export const RECORD_STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] =
  getVocabularyOptions("relationship_type").map((opt) => ({
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
  "text-left text-sm rounded-sm -mx-1 px-1 py-0.5 max-w-full transition hover:bg-muted/40";

export function AccountRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground pt-0.5">{label}</dt>
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
    return (
      <Link
        href={linkHref}
        onDoubleClick={(e) => {
          e.preventDefault();
          setEditing(true);
        }}
        className={cn(
          inlineFieldBase,
          "font-medium text-flame underline decoration-flame/35 underline-offset-2 hover:decoration-flame",
          className
        )}
        title="Double-click to edit"
      >
        {display}
      </Link>
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

export function InlineSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  popoverClassName,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
}) {
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;
  const isEmpty = !selected || !value;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 text-sm rounded-sm -mx-1 px-1 py-0.5 hover:bg-muted/40 transition",
            isEmpty ? "text-muted-foreground/80 italic" : "text-foreground",
            className
          )}
        >
          <span>{label}</span>
          <ChevronDown className="size-3 opacity-35 shrink-0" strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-44 p-1", popoverClassName)}>
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative flex w-full items-center rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/60 transition",
                isSelected && "bg-muted/40"
              )}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <Check className="absolute right-2 size-4 text-foreground/70" strokeWidth={2.25} />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = () => {
    onChange(draft || null);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={draft}
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

  const isEmpty = !value;
  const displayValue = value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;

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
      {displayValue}
    </button>
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
          maximumFractionDigits: 0,
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
