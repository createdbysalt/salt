"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { cn } from "@repo/utils";
import {
  SlidersHorizontal,
  List,
  LayoutGrid,
  ArrowUpDown,
  Columns3,
  GanttChart,
} from "lucide-react";

export type ProjectViewMode = "grid" | "list" | "board" | "timeline";
export type ProjectSortOption = "created" | "name" | "status" | "deadline" | "client";

export interface ProjectDisplayProperty {
  id: string;
  label: string;
  enabledByDefault: boolean;
}

export const PROJECT_DISPLAY_PROPERTIES: ProjectDisplayProperty[] = [
  { id: "client", label: "Client", enabledByDefault: true },
  { id: "status", label: "Status", enabledByDefault: true },
  { id: "health", label: "Health", enabledByDefault: true },
  { id: "milestones", label: "Milestones", enabledByDefault: true },
  { id: "tags", label: "Tags", enabledByDefault: false },
  { id: "deadline", label: "Deadline", enabledByDefault: true },
  { id: "value", label: "Value", enabledByDefault: false },
  { id: "tasks", label: "Tasks", enabledByDefault: false },
  { id: "type", label: "Type", enabledByDefault: true },
];

const DEFAULT_ENABLED = PROJECT_DISPLAY_PROPERTIES
  .filter((p) => p.enabledByDefault)
  .map((p) => p.id);

export interface ProjectDisplaySettings {
  viewMode: ProjectViewMode;
  sortBy: ProjectSortOption;
  enabledProperties: string[];
}

const STORAGE_KEY = "salt-projects-display-settings";

function getDefaultSettings(): ProjectDisplaySettings {
  return {
    viewMode: "grid", // Default to grid (cards) per user request
    sortBy: "created",
    enabledProperties: DEFAULT_ENABLED,
  };
}

function loadSettings(): ProjectDisplaySettings {
  if (typeof window === "undefined") return getDefaultSettings();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...getDefaultSettings(),
        ...parsed,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultSettings();
}

function saveSettings(settings: ProjectDisplaySettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function useProjectDisplaySettings(initialView?: ProjectViewMode) {
  const [settings, setSettings] = useState<ProjectDisplaySettings>(() => {
    const loaded = loadSettings();
    if (initialView) {
      return { ...loaded, viewMode: initialView };
    }
    return loaded;
  });

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings((prev) => ({
      ...loaded,
      viewMode: initialView || loaded.viewMode,
    }));
  }, [initialView]);

  const updateSettings = (newSettings: ProjectDisplaySettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return { settings, updateSettings };
}

interface ProjectDisplaySettingsPopoverProps {
  settings: ProjectDisplaySettings;
  onSettingsChange: (settings: ProjectDisplaySettings) => void;
}

export function ProjectDisplaySettingsPopover({
  settings,
  onSettingsChange,
}: ProjectDisplaySettingsPopoverProps) {
  const [open, setOpen] = useState(false);

  const toggleProperty = (propertyId: string) => {
    const currentEnabled = settings.enabledProperties;
    const newEnabled = currentEnabled.includes(propertyId)
      ? currentEnabled.filter((id) => id !== propertyId)
      : [...currentEnabled, propertyId];
    onSettingsChange({ ...settings, enabledProperties: newEnabled });
  };

  const handleReset = () => {
    onSettingsChange(getDefaultSettings());
  };

  const viewModes: { value: ProjectViewMode; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { value: "grid", label: "Cards", icon: <LayoutGrid className="h-5 w-5" /> },
    { value: "list", label: "List", icon: <List className="h-5 w-5" /> },
    { value: "board", label: "Board", icon: <Columns3 className="h-5 w-5" /> },
    { value: "timeline", label: "Timeline", icon: <GanttChart className="h-5 w-5" />, disabled: true },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Display
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[340px] p-0" align="end">
        {/* View Mode Tabs - Linear Style */}
        <div className="flex justify-center gap-1 p-3 border-b bg-muted/30">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => !mode.disabled && onSettingsChange({ ...settings, viewMode: mode.value })}
              disabled={mode.disabled}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all",
                settings.viewMode === mode.value
                  ? "bg-muted border border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                mode.disabled && "opacity-40 cursor-not-allowed"
              )}
              title={mode.disabled ? "Coming soon" : undefined}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* View Options */}
        <div className="px-4 pt-4 pb-2">
          {/* Ordering */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span>Ordering</span>
            </div>
            <Select
              value={settings.sortBy}
              onValueChange={(value: ProjectSortOption) =>
                onSettingsChange({ ...settings, sortBy: value })
              }
            >
              <SelectTrigger className="w-[130px] h-8 bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Display Properties */}
        <div className="px-4 pt-3 pb-4">
          <span className="text-sm font-medium text-foreground">Display properties</span>
          <div className="flex flex-wrap gap-2 mt-4">
            {PROJECT_DISPLAY_PROPERTIES.map((property) => {
              const isEnabled = settings.enabledProperties.includes(property.id);
              // Status is always enabled (core organizing principle)
              const isRequired = property.id === "status";

              return (
                <button
                  key={property.id}
                  onClick={() => !isRequired && toggleProperty(property.id)}
                  disabled={isRequired}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-all",
                    isEnabled
                      ? "bg-foreground/10 border-foreground/20 text-foreground"
                      : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                    isRequired && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {property.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center px-4 py-3 border-t">
          <button
            onClick={handleReset}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset to default
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
