"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import {
  InlineSearchPickerPopover,
  inlineEntityPickerTriggerClassName,
} from "@/app/_features/memory/components/InlineSearchPickerPopover";
import {
  searchWork,
  type WorkSearchResult,
} from "@/app/_features/memory/actions/search-work";

const defaultTriggerClassName =
  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type WorkSearchComboboxProps = {
  value: string;
  onChange: (workName: string) => void;
  /** Called with the selected record's id + name (for persistence). */
  onSelectOption?: (option: { id: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  inline?: boolean;
};

export function WorkSearchCombobox({
  value,
  onChange,
  onSelectOption,
  placeholder = "Search work...",
  className,
  popoverClassName,
  inline = false,
}: WorkSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [workItems, setWorkItems] = useState<WorkSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWork = useCallback(async (query: string) => {
    setLoading(true);
    const result = await searchWork(query);
    if (result.ok) {
      setWorkItems(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadWork(search);
  }, [open, search, loadWork]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

  const handleSelect = (workName: string) => {
    onChange(workName);
    const work = workItems.find((w) => w.name === workName);
    if (work) onSelectOption?.({ id: work.id, name: work.name });
    setOpen(false);
    setSearch("");
  };

  const isEmpty = !value;

  const trigger = (
    <button
      type="button"
      className={cn(
        inline ? inlineEntityPickerTriggerClassName : defaultTriggerClassName,
        inline && (isEmpty ? "text-muted-foreground/80 italic" : "text-foreground"),
        className,
      )}
    >
      <span className={cn("truncate", !inline && !value && "text-muted-foreground")}>
        {value || placeholder}
      </span>
      {inline ? (
        <ChevronDown className="size-3 shrink-0 opacity-35" strokeWidth={2.25} />
      ) : (
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      )}
    </button>
  );

  return (
    <RadixAfterHydration fallback={trigger}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              inline ? inlineEntityPickerTriggerClassName : defaultTriggerClassName,
              inline && (isEmpty ? "text-muted-foreground/80 italic" : "text-foreground"),
              className,
            )}
          >
            <span className={cn("truncate", !inline && !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
            {inline ? (
              <ChevronDown className="size-3 shrink-0 opacity-35" strokeWidth={2.25} />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </button>
        </PopoverTrigger>
        <InlineSearchPickerPopover
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search work..."
          loading={loading}
          emptyMessage={search.trim() ? "No work found." : "No work yet."}
          options={workItems.map((item) => ({ id: item.id, label: item.name }))}
          selectedValue={value}
          onSelect={handleSelect}
          popoverClassName={popoverClassName}
          variant={inline ? "inline" : "panel"}
        />
      </Popover>
    </RadixAfterHydration>
  );
}
