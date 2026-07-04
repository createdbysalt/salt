"use client";

import { Check, Loader2, Search } from "lucide-react";
import { Input, PopoverContent } from "@repo/ui";
import { cn } from "@repo/utils";

export const inlineEntityPickerTriggerClassName =
  "inline-flex items-center gap-0.5 text-sm rounded-sm -mx-1 px-1 py-0.5 hover:bg-muted/40 transition max-w-full";

export const inlineEntityPickerPopoverClassName = "w-52 p-1";

const inlineEntityPickerOptionClassName =
  "relative flex w-full items-center rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/60 transition";

const panelEntityPickerOptionClassName =
  "relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-muted/60";

function getInitials(label: string): string {
  return label
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type InlineSearchPickerOption = {
  id: string;
  label: string;
};

type InlineSearchPickerPopoverProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  loading: boolean;
  emptyMessage: string;
  options: InlineSearchPickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  isOptionSelected?: (option: InlineSearchPickerOption, selectedValue: string) => boolean;
  getSelectValue?: (option: InlineSearchPickerOption) => string;
  onClear?: () => void;
  allowClear?: boolean;
  popoverClassName?: string;
  variant?: "inline" | "panel";
  showAvatars?: boolean;
};

export function InlineSearchPickerPopover({
  search,
  onSearchChange,
  searchPlaceholder,
  loading,
  emptyMessage,
  options,
  selectedValue,
  onSelect,
  isOptionSelected = (option, value) => option.label === value,
  getSelectValue = (option) => option.label,
  onClear,
  allowClear = false,
  popoverClassName,
  variant = "inline",
  showAvatars = false,
}: InlineSearchPickerPopoverProps) {
  const isPanel = variant === "panel";

  return (
    <PopoverContent
      align="start"
      className={cn(
        isPanel
          ? "w-[var(--radix-popover-trigger-width)] min-w-[280px] rounded-xl border border-border/60 bg-popover p-2 shadow-md"
          : inlineEntityPickerPopoverClassName,
        popoverClassName,
      )}
    >
      {isPanel ? (
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-full border border-border/60 bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame/30 transition"
            autoFocus
          />
        </div>
      ) : (
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-1 h-8 border-0 bg-muted/40 px-2 text-sm shadow-none focus-visible:ring-1"
          autoFocus
        />
      )}

      {loading ? (
        <div className={cn("flex items-center justify-center", isPanel ? "py-8" : "py-4")}>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : options.length === 0 ? (
        <p
          className={cn(
            "text-sm text-muted-foreground",
            isPanel ? "px-2 py-6 text-center" : "px-2 py-1.5",
          )}
        >
          {emptyMessage}
        </p>
      ) : (
        <div className={cn("overflow-y-auto", isPanel ? "max-h-60 space-y-0.5" : "max-h-48")}>
          {allowClear && selectedValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className={cn(
                isPanel ? panelEntityPickerOptionClassName : inlineEntityPickerOptionClassName,
                "text-muted-foreground",
              )}
            >
              Clear selection
            </button>
          ) : null}
          {options.map((option) => {
            const isSelected = isOptionSelected(option, selectedValue);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(getSelectValue(option))}
                className={cn(
                  isPanel ? panelEntityPickerOptionClassName : inlineEntityPickerOptionClassName,
                  isSelected && (isPanel ? "bg-muted/50" : "bg-muted/40"),
                )}
              >
                {showAvatars ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-foreground/80">
                    {getInitials(option.label)}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
                {isSelected ? (
                  <Check
                    className={cn(
                      "size-4 shrink-0 text-foreground/70",
                      isPanel ? "ml-auto" : "absolute right-2",
                    )}
                    strokeWidth={2.25}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </PopoverContent>
  );
}
