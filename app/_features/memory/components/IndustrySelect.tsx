"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Input, Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  inlineEntityPickerPopoverClassName,
  inlineEntityPickerTriggerClassName,
} from "@/app/_features/memory/components/InlineSearchPickerPopover";
import {
  INDUSTRY_PARENTS,
  INDUSTRY_CHILDREN,
  INDUSTRY_PARENT_LABELS,
  INDUSTRY_CHILD_LABELS,
  formatIndustry,
  type IndustryParent,
} from "@/app/_features/memory/taxonomy/registry";

const inlineOptionClassName =
  "relative flex w-full items-center rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/60 transition";

interface IndustrySelectProps {
  parentValue: IndustryParent | null;
  childValue: string | null;
  onParentChange: (parent: IndustryParent | null) => void;
  onChildChange: (child: string | null) => void;
  placeholder?: string;
  className?: string;
}

function matchesIndustrySearch(
  parent: IndustryParent,
  child: string | null,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (INDUSTRY_PARENT_LABELS[parent].toLowerCase().includes(normalized)) {
    return true;
  }

  if (child) {
    return (INDUSTRY_CHILD_LABELS[child] ?? child).toLowerCase().includes(normalized);
  }

  return INDUSTRY_CHILDREN[parent].some((item) =>
    (INDUSTRY_CHILD_LABELS[item] ?? item).toLowerCase().includes(normalized),
  );
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
  const [search, setSearch] = useState("");
  const [expandedParent, setExpandedParent] = useState<IndustryParent | null>(parentValue);

  useEffect(() => {
    if (parentValue) {
      setExpandedParent(parentValue);
    }
  }, [parentValue]);

  const displayValue = formatIndustry(parentValue, childValue);
  const searchQuery = search.trim().toLowerCase();

  const filteredParents = useMemo(() => {
    if (!searchQuery) return INDUSTRY_PARENTS;
    return INDUSTRY_PARENTS.filter((parent) => matchesIndustrySearch(parent, null, searchQuery));
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery) return;
    if (filteredParents.length === 1) {
      setExpandedParent(filteredParents[0] ?? null);
    }
  }, [filteredParents, searchQuery]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

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
    setSearch("");
  };

  const handleParentOnly = (parent: IndustryParent) => {
    onParentChange(parent);
    onChildChange(null);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onParentChange(null);
    onChildChange(null);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            inlineEntityPickerTriggerClassName,
            !parentValue ? "text-muted-foreground/80 italic" : "text-foreground",
            className,
          )}
        >
          <span className="truncate">{parentValue ? displayValue : placeholder}</span>
          <ChevronDown className="size-3 shrink-0 opacity-35" strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={inlineEntityPickerPopoverClassName}>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search industry..."
          className="mb-1 h-8 border-0 bg-muted/40 px-2 text-sm shadow-none focus-visible:ring-1"
          autoFocus
        />

        <div className="max-h-48 overflow-y-auto">
          {parentValue ? (
            <button
              type="button"
              onClick={handleClear}
              className={cn(inlineOptionClassName, "text-muted-foreground")}
            >
              Clear selection
            </button>
          ) : null}

          {filteredParents.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No industry found.</p>
          ) : (
            filteredParents.map((parent) => {
              const children = INDUSTRY_CHILDREN[parent];
              const visibleChildren = searchQuery
                ? children.filter((child) => matchesIndustrySearch(parent, child, searchQuery))
                : children;
              const isExpanded = searchQuery ? visibleChildren.length > 0 : expandedParent === parent;
              const isParentSelected = parentValue === parent && !childValue;

              return (
                <div key={parent}>
                  <button
                    type="button"
                    onClick={() => handleParentSelect(parent)}
                    className={cn(
                      inlineOptionClassName,
                      "justify-between gap-2",
                      isParentSelected && "bg-muted/40",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {children.length > 0 ? (
                        <ChevronRight
                          className={cn(
                            "size-3 shrink-0 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90",
                          )}
                          strokeWidth={2.25}
                        />
                      ) : (
                        <span className="size-3 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">{INDUSTRY_PARENT_LABELS[parent]}</span>
                    </span>
                    {isParentSelected ? (
                      <Check className="size-4 shrink-0 text-foreground/70" strokeWidth={2.25} />
                    ) : null}
                  </button>

                  {isExpanded && children.length > 0 ? (
                    <div className="ml-2 border-l border-border/50 pl-1">
                      {(!searchQuery || INDUSTRY_PARENT_LABELS[parent].toLowerCase().includes(searchQuery)) ? (
                        <button
                          type="button"
                          onClick={() => handleParentOnly(parent)}
                          className={cn(
                            inlineOptionClassName,
                            "text-xs text-muted-foreground",
                            isParentSelected && "bg-muted/40",
                          )}
                        >
                          <span className="truncate">
                            {INDUSTRY_PARENT_LABELS[parent]} (general)
                          </span>
                          {isParentSelected ? (
                            <Check
                              className="absolute right-2 size-3 shrink-0 text-foreground/70"
                              strokeWidth={2.25}
                            />
                          ) : null}
                        </button>
                      ) : null}
                      {visibleChildren.map((child) => {
                        const isSelected = parentValue === parent && childValue === child;
                        return (
                          <button
                            key={child}
                            type="button"
                            onClick={() => handleChildSelect(parent, child)}
                            className={cn(
                              inlineOptionClassName,
                              "justify-between gap-2",
                              isSelected && "bg-muted/40",
                            )}
                          >
                            <span className="truncate">
                              {INDUSTRY_CHILD_LABELS[child] ?? child}
                            </span>
                            {isSelected ? (
                              <Check
                                className="size-4 shrink-0 text-foreground/70"
                                strokeWidth={2.25}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
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
