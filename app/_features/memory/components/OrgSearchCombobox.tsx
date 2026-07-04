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
  searchOrganizations,
  type OrgSearchResult,
} from "@/app/_features/memory/actions/search-organizations";

const defaultTriggerClassName =
  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type OrgSearchComboboxProps = {
  value: string;
  onChange: (orgName: string) => void;
  /** Called with the selected record's id + name (for persistence). */
  onSelectOption?: (option: { id: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  inline?: boolean;
};

export function OrgSearchCombobox({
  value,
  onChange,
  onSelectOption,
  placeholder = "Search organizations...",
  className,
  popoverClassName,
  inline = false,
}: OrgSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<OrgSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrgs = useCallback(async (query: string) => {
    setLoading(true);
    const result = await searchOrganizations(query);
    if (result.ok) {
      setOrgs(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadOrgs(search);
  }, [open, search, loadOrgs]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

  const handleSelect = (orgName: string) => {
    onChange(orgName);
    const org = orgs.find((o) => o.name === orgName);
    if (org) onSelectOption?.({ id: org.id, name: org.name });
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
          searchPlaceholder="Search organizations..."
          loading={loading}
          emptyMessage={search.trim() ? "No organizations found." : "No organizations yet."}
          options={orgs.map((org) => ({ id: org.id, label: org.name }))}
          selectedValue={value}
          onSelect={handleSelect}
          popoverClassName={popoverClassName}
          variant={inline ? "inline" : "panel"}
        />
      </Popover>
    </RadixAfterHydration>
  );
}
