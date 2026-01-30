"use client";

import { Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@repo/utils";

type DeviceType = "desktop" | "tablet" | "mobile";

interface PreviewControlsProps {
  selectedDevice?: DeviceType;
  onDeviceChange?: (device: DeviceType) => void;
  previewUrl?: string;
}

const DEVICES: { id: DeviceType; icon: typeof Monitor; label: string }[] = [
  { id: "desktop", icon: Monitor, label: "Desktop" },
  { id: "tablet", icon: Tablet, label: "Tablet" },
  { id: "mobile", icon: Smartphone, label: "Mobile" },
];

/**
 * PreviewControls - Device toggle for portal preview
 * Desktop/Tablet/Mobile viewport simulation
 */
export function PreviewControls({
  selectedDevice = "desktop",
  onDeviceChange,
  previewUrl,
}: PreviewControlsProps) {
  const handleDeviceClick = (device: DeviceType) => {
    onDeviceChange?.(device);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Preview Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device selector */}
        <div className="flex justify-center gap-2">
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 h-12 flex-col gap-1",
                selectedDevice === id && "bg-muted"
              )}
              onClick={() => handleDeviceClick(id)}
              disabled={!onDeviceChange}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>

        {/* Preview link */}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2"
          disabled={!previewUrl}
          asChild={!!previewUrl}
        >
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </a>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Preview not available
            </>
          )}
        </Button>

        {/* Status note */}
        <p className="text-xs text-center text-muted-foreground">
          Preview shows how clients will see their portal
        </p>
      </CardContent>
    </Card>
  );
}
