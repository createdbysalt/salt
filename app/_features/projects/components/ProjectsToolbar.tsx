"use client";

import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Table2,
  Kanban,
  LayoutGrid,
  GanttChartSquare,
  Check,
} from "lucide-react";
import Link from "next/link";
import { studioRoutes } from "@/app/_features/shell/routes";

export type ProjectViewMode = "grid" | "list" | "board" | "timeline";

interface ProjectsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
}

/**
 * ProjectsToolbar - Header with search and display options
 *
 * Display options:
 * - Grid: Card view (default, existing)
 * - List: Table view
 * - Board: Kanban by status
 * - Timeline: Gantt-style (coming soon)
 */
export function ProjectsToolbar({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: ProjectsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Title */}
      <h1 className="text-xl font-medium tracking-tight">Projects</h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 w-[200px] h-8 text-sm"
          />
        </div>

        {/* View Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Display
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => onViewModeChange("grid")}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cards
              {viewMode === "grid" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange("list")}>
              <Table2 className="h-4 w-4 mr-2" />
              List
              {viewMode === "list" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange("board")}>
              <Kanban className="h-4 w-4 mr-2" />
              Board
              {viewMode === "board" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange("timeline")} disabled>
              <GanttChartSquare className="h-4 w-4 mr-2" />
              Timeline
              <span className="text-xs text-muted-foreground ml-auto">Soon</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Project */}
        <Button size="sm" className="h-8 gap-2" asChild>
          <Link href={studioRoutes.projects.new}>
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>
    </div>
  );
}
