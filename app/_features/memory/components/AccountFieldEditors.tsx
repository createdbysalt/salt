"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import type { RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";

export const RECORD_STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "Client", label: "Client" },
  { value: "Prospect", label: "Prospect" },
  { value: "Partner", label: "Partner" },
  { value: "Vendor", label: "Vendor" },
  { value: "Internal", label: "Internal" },
  { value: "Past client", label: "Past client" },
  { value: "Personal", label: "Personal" },
  { value: "Unknown", label: "Unknown" },
];

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
