"use client";

import { Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import { cn } from "@repo/utils";
import type { PreviewDevice } from "../hooks/usePreviewDevice";

interface ServePreviewControlsProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  onOpenNewTab: () => void;
  disabled?: boolean;
  className?: string;
}

const DEVICES: { id: PreviewDevice; icon: typeof Monitor; label: string; shortcut: string }[] = [
  { id: "desktop", icon: Monitor, label: "Desktop", shortcut: "⌘1" },
  { id: "tablet", icon: Tablet, label: "Tablet", shortcut: "⌘2" },
  { id: "mobile", icon: Smartphone, label: "Mobile", shortcut: "⌘3" },
];

/**
 * ServePreviewControls - Device toggle for portal preview
 *
 * Features:
 * - Desktop/Tablet/Mobile viewport simulation
 * - Open in new tab button
 * - Keyboard shortcuts (Cmd+1/2/3)
 */
export function ServePreviewControls({
  device,
  onDeviceChange,
  onOpenNewTab,
  disabled = false,
  className,
}: ServePreviewControlsProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center justify-center gap-1 p-2",
          "bg-muted/50 rounded-lg border border-border",
          className
        )}
      >
        {/* Device Toggle */}
        <div className="flex items-center gap-1 bg-background rounded-md p-1">
          {DEVICES.map(({ id, icon: Icon, label, shortcut }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-3 gap-2",
                    device === id && "bg-muted"
                  )}
                  onClick={() => onDeviceChange(id)}
                  disabled={disabled}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {label} view ({shortcut})
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Open in New Tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-2"
              onClick={onOpenNewTab}
              disabled={disabled}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Open</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open portal in new tab (⌘O)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
