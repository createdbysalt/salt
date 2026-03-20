"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Input } from "@/app/_components/ui/input";
import { Badge } from "@/app/_components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Search, X, BookOpen } from "lucide-react";
import { BridgeKnowledgeList } from "@/app/_features/knowledge/components";
import {
  KNOWLEDGE_TYPE_CONFIG,
  type KnowledgeItemWithRelations,
  type KnowledgeType,
} from "@/app/_features/knowledge/types";

// Client-visible knowledge types (same as in queries)
const CLIENT_VISIBLE_TYPES: KnowledgeType[] = [
  "discovery_note",
  "meeting_transcript",
  "document",
  "link",
  "decision",
  "feedback",
  "asset",
];

interface BridgeKnowledgePageClientProps {
  initialItems: KnowledgeItemWithRelations[];
  availableTags: string[];
}

export function BridgeKnowledgePageClient({
  initialItems,
  availableTags,
}: BridgeKnowledgePageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<KnowledgeType | "all">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // Toggle tag selection
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedType("all");
    setSelectedTags([]);
  }, []);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Type filter
      if (selectedType !== "all" && item.type !== selectedType) {
        return false;
      }

      // Tags filter (item must have ALL selected tags)
      if (selectedTags.length > 0) {
        const itemTags = item.tags || [];
        if (!selectedTags.every((tag) => itemTags.includes(tag))) {
          return false;
        }
      }

      // Search filter
      if (debouncedSearch.trim()) {
        const searchLower = debouncedSearch.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const contentMatch = item.content?.toLowerCase().includes(searchLower);
        if (!titleMatch && !contentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [initialItems, selectedType, selectedTags, debouncedSearch]);

  const hasActiveFilters =
    debouncedSearch || selectedType !== "all" || selectedTags.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        </div>
        <p className="text-muted-foreground">
          Helpful documents, notes, and resources from your studio
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={selectedType}
            onValueChange={(value) =>
              setSelectedType(value as KnowledgeType | "all")
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CLIENT_VISIBLE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {KNOWLEDGE_TYPE_CONFIG[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag Filters */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {filteredItems.length} of {initialItems.length} items
            </span>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Knowledge Items List */}
      <BridgeKnowledgeList
        items={filteredItems}
        emptyMessage={
          hasActiveFilters ? "No items match your filters" : "No knowledge items yet"
        }
        emptyDescription={
          hasActiveFilters
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Your studio will add helpful documents, notes, and resources here as they become available."
        }
      />
    </div>
  );
}
