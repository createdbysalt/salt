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
  searchPeople,
  type PersonSearchResult,
} from "@/app/_features/memory/actions/search-people";

const defaultTriggerClassName =
  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export type PersonSearchComboboxProps = {
  value: string;
  onChange: (personName: string) => void;
  /** Called with the selected record's id + name (for persistence). */
  onSelectOption?: (option: { id: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  inline?: boolean;
  allowClear?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PersonSearchCombobox({
  value,
  onChange,
  onSelectOption,
  placeholder = "Search people...",
  className,
  popoverClassName,
  inline = false,
  allowClear = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PersonSearchComboboxProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPeople = useCallback(async (query: string) => {
    setLoading(true);
    const result = await searchPeople(query);
    if (result.ok) {
      setPeople(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadPeople(search);
  }, [open, search, loadPeople]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

  const handleSelect = (personName: string) => {
    onChange(personName);
    const person = people.find((p) => p.name === personName);
    if (person) onSelectOption?.({ id: person.id, name: person.name });
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("");
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
          searchPlaceholder="Search people..."
          loading={loading}
          emptyMessage={search.trim() ? "No people found." : "No people yet."}
          options={people.map((person) => ({ id: person.id, label: person.name }))}
          selectedValue={value}
          onSelect={handleSelect}
          onClear={handleClear}
          allowClear={allowClear}
          popoverClassName={popoverClassName}
          variant={inline ? "inline" : "panel"}
          showAvatars={!inline}
        />
      </Popover>
    </RadixAfterHydration>
  );
}
