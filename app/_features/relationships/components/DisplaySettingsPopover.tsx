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
} from "lucide-react";

export type ViewMode = "table" | "board" | "grid";
export type SortOption = "created" | "name" | "stage" | "lastActivity";

export interface DisplayProperty {
  id: string;
  label: string;
  enabledByDefault: boolean;
}

export const DISPLAY_PROPERTIES: DisplayProperty[] = [
  { id: "company", label: "Company", enabledByDefault: true },
  { id: "stage", label: "Stage", enabledByDefault: true },
  { id: "tags", label: "Tags", enabledByDefault: false },
  { id: "created", label: "Created", enabledByDefault: true },
  { id: "mrr", label: "MRR", enabledByDefault: false },
  { id: "projects", label: "Projects", enabledByDefault: false },
  { id: "phone", label: "Phone", enabledByDefault: false },
  { id: "lastActivity", label: "Last Activity", enabledByDefault: false },
];

const DEFAULT_ENABLED = DISPLAY_PROPERTIES
  .filter((p) => p.enabledByDefault)
  .map((p) => p.id);

export interface DisplaySettings {
  viewMode: ViewMode;
  sortBy: SortOption;
  enabledProperties: string[];
}

const STORAGE_KEY = "salt-clients-display-settings";

function getDefaultSettings(): DisplaySettings {
  return {
    viewMode: "table",
    sortBy: "created",
    enabledProperties: DEFAULT_ENABLED,
  };
}

function loadSettings(): DisplaySettings {
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

function saveSettings(settings: DisplaySettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

interface DisplaySettingsPopoverProps {
  settings: DisplaySettings;
  onSettingsChange: (settings: DisplaySettings) => void;
}

export function useDisplaySettings(initialView?: ViewMode) {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
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

  const updateSettings = (newSettings: DisplaySettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return { settings, updateSettings };
}

export function DisplaySettingsPopover({
  settings,
  onSettingsChange,
}: DisplaySettingsPopoverProps) {
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

  const viewModes: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: "table", label: "List", icon: <List className="h-5 w-5" /> },
    { value: "board", label: "Board", icon: <Columns3 className="h-5 w-5" /> },
    { value: "grid", label: "Cards", icon: <LayoutGrid className="h-5 w-5" /> },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Display
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px] p-0" align="end">
        {/* View Mode Tabs - Linear Style */}
        <div className="flex justify-center gap-1 p-3 border-b bg-muted/30">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onSettingsChange({ ...settings, viewMode: mode.value })}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-medium transition-all",
                settings.viewMode === mode.value
                  ? "bg-muted border border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
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
              onValueChange={(value: SortOption) =>
                onSettingsChange({ ...settings, sortBy: value })
              }
            >
              <SelectTrigger className="w-[130px] h-8 bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
                <SelectItem value="lastActivity">Last Activity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Display Properties */}
        <div className="px-4 pt-3 pb-4">
          <span className="text-sm font-medium text-foreground">Display properties</span>
          <div className="flex flex-wrap gap-2 mt-4">
            {DISPLAY_PROPERTIES.map((property) => {
              const isEnabled = settings.enabledProperties.includes(property.id);
              // Stage is always enabled (core organizing principle)
              const isRequired = property.id === "stage";

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
