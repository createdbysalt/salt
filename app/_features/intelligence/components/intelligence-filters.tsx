"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";

interface IntelligenceFiltersProps {
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  type: "all" | "strategic" | "technical";
  urgency: "all" | "critical";
  timeRange: "realtime" | "24h" | "7d" | "30d";
  project?: string;
  client?: string;
}

export function IntelligenceFilters({ onFilterChange }: IntelligenceFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    type: "all",
    urgency: "all",
    timeRange: "7d",
  });

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      type: "all",
      urgency: "all",
      timeRange: "7d",
    };
    setFilters(defaultFilters);
    onFilterChange?.(defaultFilters);
  };

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.urgency !== "all" ||
    filters.timeRange !== "7d";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Type:</span>
        <div className="flex gap-1">
          <Button
            variant={filters.type === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("type", "all")}
          >
            All
          </Button>
          <Button
            variant={filters.type === "strategic" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("type", "strategic")}
          >
            Strategic
          </Button>
          <Button
            variant={filters.type === "technical" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("type", "technical")}
          >
            Technical
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Urgency:</span>
        <div className="flex gap-1">
          <Button
            variant={filters.urgency === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("urgency", "all")}
          >
            All
          </Button>
          <Button
            variant={filters.urgency === "critical" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("urgency", "critical")}
          >
            Critical Only
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Time:</span>
        <Select
          value={filters.timeRange}
          onValueChange={(value) =>
            handleFilterChange("timeRange", value as FilterState["timeRange"])
          }
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realtime">Real-time</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
