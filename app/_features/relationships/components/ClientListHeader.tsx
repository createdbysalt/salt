"use client";

import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import {
  Search,
  Download,
  Upload,
  Plus,
} from "lucide-react";
import {
  DisplaySettingsPopover,
  type DisplaySettings,
} from "./DisplaySettingsPopover";

// Re-export ViewMode for backwards compatibility
export type ViewMode = "table" | "grid" | "board";

interface ClientListHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  displaySettings: DisplaySettings;
  onDisplaySettingsChange: (settings: DisplaySettings) => void;
  onExport: () => void;
  onNewClient: () => void;
  onImport: () => void;
  isExporting?: boolean;
}

export function ClientListHeader({
  searchTerm,
  onSearchChange,
  displaySettings,
  onDisplaySettingsChange,
  onExport,
  onNewClient,
  onImport,
  isExporting = false,
}: ClientListHeaderProps) {
  return (
    <div className="flex items-center justify-end gap-2">
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

      {/* Display Settings (View + Properties) */}
      <DisplaySettingsPopover
        settings={displaySettings}
        onSettingsChange={onDisplaySettingsChange}
      />

      {/* Import */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2"
        onClick={onImport}
      >
        <Upload className="h-4 w-4" />
        Import
      </Button>

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
  );
}
