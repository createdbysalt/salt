"use client";

import { Check, Loader2 } from "lucide-react";
import { Input, PopoverContent } from "@repo/ui";
import { cn } from "@repo/utils";

export const inlineEntityPickerTriggerClassName =
  "inline-flex items-center gap-0.5 text-sm rounded-sm -mx-1 px-1 py-0.5 hover:bg-muted/40 transition max-w-full";

export const inlineEntityPickerPopoverClassName = "w-52 p-1";

const inlineEntityPickerOptionClassName =
  "relative flex w-full items-center rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/60 transition";

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
}: InlineSearchPickerPopoverProps) {
  return (
    <PopoverContent align="start" className={cn(inlineEntityPickerPopoverClassName, popoverClassName)}>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="mb-1 h-8 border-0 bg-muted/40 px-2 text-sm shadow-none focus-visible:ring-1"
        autoFocus
      />
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : options.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {allowClear && selectedValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className={cn(inlineEntityPickerOptionClassName, "text-muted-foreground")}
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
                className={cn(inlineEntityPickerOptionClassName, isSelected && "bg-muted/40")}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <Check className="absolute right-2 size-4 text-foreground/70" strokeWidth={2.25} />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </PopoverContent>
  );
}
