"use client";

import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Search, Plus } from "lucide-react";
import {
  ProjectDisplaySettingsPopover,
  type ProjectDisplaySettings,
} from "./ProjectDisplaySettings";

interface ProjectListHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  displaySettings: ProjectDisplaySettings;
  onDisplaySettingsChange: (settings: ProjectDisplaySettings) => void;
  onNewProject: () => void;
}

export function ProjectListHeader({
  searchTerm,
  onSearchChange,
  displaySettings,
  onDisplaySettingsChange,
  onNewProject,
}: ProjectListHeaderProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 w-[200px] h-8 text-sm"
        />
      </div>

      {/* Display Settings (View + Properties) */}
      <ProjectDisplaySettingsPopover
        settings={displaySettings}
        onSettingsChange={onDisplaySettingsChange}
      />

      {/* New Project */}
      <Button size="sm" className="h-8 gap-2" onClick={onNewProject}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}
