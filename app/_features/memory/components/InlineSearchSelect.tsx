"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  InlineSearchPickerPopover,
  inlineEntityPickerTriggerClassName,
} from "@/app/_features/memory/components/InlineSearchPickerPopover";

export function InlineSearchSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  className,
  popoverClassName,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  popoverClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((option) => option.value === value);
  const triggerLabel = selected?.label ?? placeholder;
  const isEmpty = !selected || !value;

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue as T);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            inlineEntityPickerTriggerClassName,
            isEmpty ? "text-muted-foreground/80 italic" : "text-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-3 shrink-0 opacity-35" strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <InlineSearchPickerPopover
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={searchPlaceholder}
        loading={false}
        emptyMessage={search.trim() ? emptyMessage : emptyMessage}
        options={filteredOptions.map((option) => ({ id: option.value, label: option.label }))}
        selectedValue={value}
        isOptionSelected={(option, selected) => option.id === selected}
        getSelectValue={(option) => option.id}
        onSelect={handleSelect}
        popoverClassName={popoverClassName}
      />
    </Popover>
  );
}
