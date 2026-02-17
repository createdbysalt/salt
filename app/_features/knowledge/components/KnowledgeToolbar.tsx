"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  StickyNote,
  Upload,
  Link as LinkIcon,
  X,
} from "lucide-react";
import type { FilterType } from "./TypeFilterPills";

export type ViewMode = "list" | "grid";
export type QuickAction = "note" | "file" | "link";

interface KnowledgeToolbarProps {
  // Filter state
  selectedFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  filterCounts?: Partial<Record<FilterType, number>>;

  // Search state
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Actions
  onAction: (action: QuickAction) => void;

  className?: string;
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "links", label: "Links" },
];

export function KnowledgeToolbar({
  selectedFilter,
  onFilterChange,
  filterCounts,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAction,
  className,
}: KnowledgeToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {/* Filter Pills */}
      <div className="flex items-center gap-0.5 p-0.5 bg-muted/30 rounded-lg border border-border/50">
        {FILTERS.map((filter) => {
          const count = filterCounts?.[filter.id];
          const isActive = selectedFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                isActive
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-1 tabular-nums ${
                    isActive ? "text-foreground/60" : "text-muted-foreground/60"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View Toggle */}
      <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-1 rounded transition-colors ${
            viewMode === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-1 rounded transition-colors ${
            viewMode === "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div
        className={`relative transition-all duration-200 ${
          isSearchFocused || searchQuery ? "w-48" : "w-32"
        }`}
      >
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="h-7 pl-7 pr-7 text-xs bg-muted/50 border-transparent focus:border-border focus:bg-background"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Add Button with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2.5 gap-1 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={() => onAction("note")}
            className="text-xs gap-2"
          >
            <StickyNote className="h-3.5 w-3.5" />
            Note
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAction("file")}
            className="text-xs gap-2"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAction("link")}
            className="text-xs gap-2"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
