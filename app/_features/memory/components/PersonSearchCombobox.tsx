"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, User } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  searchPeople,
  type PersonSearchResult,
} from "@/app/_features/memory/actions/search-people";

export type PersonSearchComboboxProps = {
  value: string;
  onChange: (personName: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
};

export function PersonSearchCombobox({
  value,
  onChange,
  placeholder = "Search people...",
  className,
  allowClear = false,
}: PersonSearchComboboxProps) {
  const [open, setOpen] = useState(false);
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
    if (open) {
      loadPeople(search);
    }
  }, [open, search, loadPeople]);

  const handleSelect = (personName: string) => {
    onChange(personName);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search people..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : people.length === 0 ? (
              <CommandEmpty>
                {search.trim() ? "No people found." : "Type to search..."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {allowClear && value && (
                  <CommandItem value="__clear__" onSelect={handleClear}>
                    <span className="text-muted-foreground">Clear selection</span>
                  </CommandItem>
                )}
                {people.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.name}
                    onSelect={() => handleSelect(person.name)}
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{person.name}</span>
                    {value === person.name && (
                      <Check className="ml-auto h-4 w-4 text-foreground" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
