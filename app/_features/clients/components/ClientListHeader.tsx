"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Search,
  SlidersHorizontal,
  Download,
  Plus,
  Table2,
  LayoutGrid,
  Check,
} from "lucide-react";

export type ViewMode = "table" | "grid";

interface ClientListHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExport: () => void;
  onNewClient: () => void;
  onImport: () => void;
  isExporting?: boolean;
}

export function ClientListHeader({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onExport,
  onNewClient,
  onImport,
  isExporting = false,
}: ClientListHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Title */}
      <h1 className="text-xl font-medium tracking-tight">Clients</h1>

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
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => onViewModeChange("table")}>
              <Table2 className="h-4 w-4 mr-2" />
              Table view
              {viewMode === "table" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange("grid")}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Card view
              {viewMode === "grid" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onExport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>

        {/* New Client */}
        <Button size="sm" className="h-8 gap-2" onClick={onNewClient}>
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>
    </div>
  );
}
