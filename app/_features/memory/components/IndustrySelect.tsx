"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  INDUSTRY_PARENTS,
  INDUSTRY_CHILDREN,
  INDUSTRY_PARENT_LABELS,
  INDUSTRY_CHILD_LABELS,
  formatIndustry,
  type IndustryParent,
} from "@/app/_features/memory/taxonomy/registry";

interface IndustrySelectProps {
  parentValue: IndustryParent | null;
  childValue: string | null;
  onParentChange: (parent: IndustryParent | null) => void;
  onChildChange: (child: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function IndustrySelect({
  parentValue,
  childValue,
  onParentChange,
  onChildChange,
  placeholder = "Select industry",
  className,
}: IndustrySelectProps) {
  const [open, setOpen] = useState(false);
  const [expandedParent, setExpandedParent] = useState<IndustryParent | null>(parentValue);

  useEffect(() => {
    if (parentValue) {
      setExpandedParent(parentValue);
    }
  }, [parentValue]);

  const displayValue = formatIndustry(parentValue, childValue);

  const handleParentSelect = (parent: IndustryParent) => {
    if (expandedParent === parent) {
      setExpandedParent(null);
    } else {
      setExpandedParent(parent);
    }
  };

  const handleChildSelect = (parent: IndustryParent, child: string) => {
    onParentChange(parent);
    onChildChange(child);
    setOpen(false);
  };

  const handleParentOnly = (parent: IndustryParent) => {
    onParentChange(parent);
    onChildChange(null);
    setOpen(false);
  };

  const handleClear = () => {
    onParentChange(null);
    onChildChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 text-left text-sm rounded-sm -mx-1 px-1 py-0.5 transition hover:bg-muted/40 min-w-0",
            !parentValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{parentValue ? displayValue : placeholder}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search industry..." />
          <CommandList>
            <CommandEmpty>No industry found.</CommandEmpty>
            <CommandGroup>
              {parentValue && (
                <CommandItem onSelect={handleClear} className="text-muted-foreground">
                  Clear selection
                </CommandItem>
              )}
              {INDUSTRY_PARENTS.map((parent) => {
                const children = INDUSTRY_CHILDREN[parent];
                const isExpanded = expandedParent === parent;
                const isParentSelected = parentValue === parent && !childValue;

                return (
                  <div key={parent}>
                    <CommandItem
                      onSelect={() => handleParentSelect(parent)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {children.length > 0 ? (
                          <ChevronRight
                            className={cn(
                              "h-3 w-3 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        ) : (
                          <span className="w-3" />
                        )}
                        <span>{INDUSTRY_PARENT_LABELS[parent]}</span>
                      </div>
                      {isParentSelected && <Check className="h-4 w-4" />}
                    </CommandItem>
                    {isExpanded && children.length > 0 && (
                      <div className="ml-5 border-l border-border pl-2">
                        <CommandItem
                          onSelect={() => handleParentOnly(parent)}
                          className="text-muted-foreground text-xs"
                        >
                          {INDUSTRY_PARENT_LABELS[parent]} (general)
                          {isParentSelected && <Check className="h-3 w-3 ml-auto" />}
                        </CommandItem>
                        {children.map((child) => {
                          const isSelected = parentValue === parent && childValue === child;
                          return (
                            <CommandItem
                              key={child}
                              onSelect={() => handleChildSelect(parent, child)}
                              className="flex items-center justify-between"
                            >
                              <span>{INDUSTRY_CHILD_LABELS[child] ?? child}</span>
                              {isSelected && <Check className="h-4 w-4" />}
                            </CommandItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface InlineIndustrySelectProps {
  parentValue: IndustryParent | null;
  childValue: string | null;
  onChange: (parent: IndustryParent | null, child: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function InlineIndustrySelect({
  parentValue,
  childValue,
  onChange,
  placeholder = "Add industry",
  className,
}: InlineIndustrySelectProps) {
  return (
    <IndustrySelect
      parentValue={parentValue}
      childValue={childValue}
      onParentChange={(parent) => onChange(parent, null)}
      onChildChange={(child) => onChange(parentValue, child)}
      placeholder={placeholder}
      className={className}
    />
  );
}
