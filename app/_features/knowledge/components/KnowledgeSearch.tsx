"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, Filter, Loader2 } from "lucide-react";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { cn } from "@repo/utils";
import { KNOWLEDGE_TYPE_CONFIG, type KnowledgeType, PROJECT_FILTER_ALL } from "../types";

/** Project option for the filter dropdown */
export interface ProjectOption {
  id: string;
  name: string;
  slug: string;
}

export interface KnowledgeSearchProps {
  /** Current search query value */
  searchQuery: string;
  /** Callback when search query changes (debounced) */
  onSearchChange: (query: string) => void;
  /** Currently selected type filter */
  selectedType: KnowledgeType | "all";
  /** Callback when type filter changes */
  onTypeChange: (type: KnowledgeType | "all") => void;
  /** Available projects for filtering */
  availableProjects?: ProjectOption[];
  /** Currently selected project filter ("all" | null | project id) */
  selectedProject?: string | typeof PROJECT_FILTER_ALL | null;
  /** Callback when project filter changes */
  onProjectChange?: (projectId: string | typeof PROJECT_FILTER_ALL | null) => void;
  /** Available tags for filtering */
  availableTags: string[];
  /** Currently selected tags */
  selectedTags: string[];
  /** Callback when tag selection changes */
  onTagsChange: (tags: string[]) => void;
  /** Whether search is in progress */
  isSearching?: boolean;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Additional class names */
  className?: string;
}

/**
 * KnowledgeSearch Component
 *
 * Search and filter controls for the knowledge base.
 * Includes a search input with debounce, type filter dropdown, and tag filter chips.
 *
 * Usage:
 * ```tsx
 * <KnowledgeSearch
 *   searchQuery={filters.search ?? ""}
 *   onSearchChange={(q) => setFilters({ ...filters, search: q || undefined })}
 *   selectedType={filters.types?.[0] ?? "all"}
 *   onTypeChange={(t) => setFilters({ ...filters, types: t === "all" ? undefined : [t] })}
 *   availableTags={allTags}
 *   selectedTags={filters.tags ?? []}
 *   onTagsChange={(tags) => setFilters({ ...filters, tags: tags.length > 0 ? tags : undefined })}
 * />
 * ```
 */
export function KnowledgeSearch({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  availableProjects = [],
  selectedProject = PROJECT_FILTER_ALL,
  onProjectChange,
  availableTags,
  selectedTags,
  onTagsChange,
  isSearching = false,
  debounceMs = 300,
  className,
}: KnowledgeSearchProps) {
  const [localSearchValue, setLocalSearchValue] = useState(searchQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalSearchValue(searchQuery);
  }, [searchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle search input change with debouncing
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalSearchValue(newValue);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new debounce for search callback
      debounceRef.current = setTimeout(() => {
        onSearchChange(newValue);
      }, debounceMs);
    },
    [onSearchChange, debounceMs]
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setLocalSearchValue("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onSearchChange("");
  }, [onSearchChange]);

  // Handle Enter key for immediate search
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        onSearchChange(localSearchValue);
      }
    },
    [localSearchValue, onSearchChange]
  );

  // Handle type filter change
  const handleTypeChange = useCallback(
    (value: string) => {
      onTypeChange(value as KnowledgeType | "all");
    },
    [onTypeChange]
  );

  // Handle project filter change
  const handleProjectChange = useCallback(
    (value: string) => {
      if (!onProjectChange) return;
      if (value === "all") {
        onProjectChange(PROJECT_FILTER_ALL);
      } else if (value === "client-level") {
        onProjectChange(null);
      } else {
        onProjectChange(value);
      }
    },
    [onProjectChange]
  );

  // Handle tag toggle
  const handleTagToggle = useCallback(
    (tag: string) => {
      const isSelected = selectedTags.includes(tag);
      if (isSelected) {
        onTagsChange(selectedTags.filter((t) => t !== tag));
      } else {
        onTagsChange([...selectedTags, tag]);
      }
    },
    [selectedTags, onTagsChange]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    handleClearSearch();
    onTypeChange("all");
    onTagsChange([]);
    if (onProjectChange) {
      onProjectChange(PROJECT_FILTER_ALL);
    }
  }, [handleClearSearch, onTypeChange, onTagsChange, onProjectChange]);

  const hasActiveFilters =
    searchQuery || selectedType !== "all" || selectedTags.length > 0 ||
    (selectedProject !== PROJECT_FILTER_ALL && selectedProject !== undefined);

  // Get display value for project filter
  const getProjectDisplayValue = () => {
    if (selectedProject === PROJECT_FILTER_ALL || selectedProject === undefined) {
      return "all";
    }
    if (selectedProject === null) {
      return "client-level";
    }
    return selectedProject;
  };

  // Get display label for project filter in summary
  const getProjectFilterLabel = () => {
    if (selectedProject === null) {
      return "Client-Level Only";
    }
    const project = availableProjects.find(p => p.id === selectedProject);
    return project?.name || selectedProject;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and Type Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search knowledge base..."
            value={localSearchValue}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9"
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : localSearchValue ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : null}
        </div>

        {/* Type Filter Dropdown */}
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(KNOWLEDGE_TYPE_CONFIG).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project Filter Dropdown */}
        {availableProjects.length > 0 && onProjectChange && (
          <Select value={getProjectDisplayValue()} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="client-level">Client-Level Only</SelectItem>
              {availableProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tag Filter Chips */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
                {isSelected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Active Filters Summary & Clear Button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {[
              searchQuery && `Search: "${searchQuery}"`,
              selectedType !== "all" &&
                `Type: ${KNOWLEDGE_TYPE_CONFIG[selectedType].label}`,
              selectedProject !== PROJECT_FILTER_ALL && selectedProject !== undefined &&
                `Project: ${getProjectFilterLabel()}`,
              selectedTags.length > 0 && `Tags: ${selectedTags.join(", ")}`,
            ]
              .filter(Boolean)
              .join(" • ")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
