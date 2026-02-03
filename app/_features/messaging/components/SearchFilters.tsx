"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, X, Calendar } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { cn } from "@repo/utils";

// ============================================================================
// Types
// ============================================================================

export interface SearchFiltersState {
  fromDate: string;
  toDate: string;
  senderId: string;
}

export interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface SearchFiltersProps {
  participants: Participant[];
  onFiltersChange: (filters: SearchFiltersState) => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_FILTERS: SearchFiltersState = {
  fromDate: "",
  toDate: "",
  senderId: "",
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchFilters({
  participants,
  onFiltersChange,
  className,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersState>(() => ({
    fromDate: searchParams.get("fromDate") || "",
    toDate: searchParams.get("toDate") || "",
    senderId: searchParams.get("senderId") || "",
  }));

  // Sync filters with URL params on mount
  useEffect(() => {
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const senderId = searchParams.get("senderId") || "";

    setFilters({ fromDate, toDate, senderId });

    // Auto-expand if there are active filters
    if (fromDate || toDate || senderId) {
      setIsExpanded(true);
    }
  }, [searchParams]);

  // Update URL params when filters change
  const updateUrlParams = useCallback(
    (newFilters: SearchFiltersState) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update or remove each param
      if (newFilters.fromDate) {
        params.set("fromDate", newFilters.fromDate);
      } else {
        params.delete("fromDate");
      }

      if (newFilters.toDate) {
        params.set("toDate", newFilters.toDate);
      } else {
        params.delete("toDate");
      }

      if (newFilters.senderId) {
        params.set("senderId", newFilters.senderId);
      } else {
        params.delete("senderId");
      }

      // Update URL without scrolling
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof SearchFiltersState, value: string) => {
      const newFilters = { ...filters, [key]: value };

      // Validate date range
      if (key === "fromDate" && newFilters.toDate && value > newFilters.toDate) {
        // Clear toDate if fromDate is after toDate
        newFilters.toDate = "";
      }
      if (key === "toDate" && newFilters.fromDate && value < newFilters.fromDate) {
        // Clear fromDate if toDate is before fromDate
        newFilters.fromDate = "";
      }

      setFilters(newFilters);
      updateUrlParams(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange, updateUrlParams]
  );

  // Handle clear all filters
  const handleClearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    updateUrlParams(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange, updateUrlParams]);

  // Handle removing individual filter
  const handleRemoveFilter = useCallback(
    (key: keyof SearchFiltersState) => {
      const newFilters = { ...filters, [key]: "" };
      setFilters(newFilters);
      updateUrlParams(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange, updateUrlParams]
  );

  // Check if any filters are active
  const hasActiveFilters = filters.fromDate || filters.toDate || filters.senderId;

  // Get selected sender name for display
  const selectedSender = participants.find((p) => p.id === filters.senderId);

  // Count active filters
  const activeFilterCount = [
    filters.fromDate,
    filters.toDate,
    filters.senderId,
  ].filter(Boolean).length;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Filter Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Calendar className="h-3.5 w-3.5" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {activeFilterCount}
          </Badge>
        )}
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Expandable Filters Section */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-wrap items-end gap-3 pt-2">
          {/* Date Range - From */}
          <div className="space-y-1.5">
            <Label htmlFor="fromDate" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="fromDate"
              type="date"
              value={filters.fromDate ? filters.fromDate.split("T")[0] : ""}
              onChange={(e) => {
                const value = e.target.value;
                // Convert to ISO format with time
                handleFilterChange(
                  "fromDate",
                  value ? new Date(value).toISOString() : ""
                );
              }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {/* Date Range - To */}
          <div className="space-y-1.5">
            <Label htmlFor="toDate" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="toDate"
              type="date"
              value={filters.toDate ? filters.toDate.split("T")[0] : ""}
              onChange={(e) => {
                const value = e.target.value;
                // Convert to ISO format with time (end of day)
                handleFilterChange(
                  "toDate",
                  value ? new Date(value + "T23:59:59.999Z").toISOString() : ""
                );
              }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {/* Sender Filter */}
          {participants.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="sender" className="text-xs text-muted-foreground">
                Sender
              </Label>
              <Select
                value={filters.senderId || "all"}
                onValueChange={(value) =>
                  handleFilterChange("senderId", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="All senders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All senders</SelectItem>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClearAll}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 animate-in fade-in-0 duration-150">
          {filters.fromDate && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => handleRemoveFilter("fromDate")}
            >
              From: {formatDateForDisplay(filters.fromDate)}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.toDate && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => handleRemoveFilter("toDate")}
            >
              To: {formatDateForDisplay(filters.toDate)}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {selectedSender && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => handleRemoveFilter("senderId")}
            >
              From: {selectedSender.name}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
