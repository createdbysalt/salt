"use client";

import { cn } from "@repo/utils";

type DeviceMode = "desktop" | "tablet" | "mobile";

interface BridgePreviewShellProps {
  /** Current device mode */
  deviceMode: DeviceMode;
  /** The content to render inside the preview frame */
  children?: React.ReactNode;
}

export function BridgePreviewShell({
  deviceMode,
  children,
}: BridgePreviewShellProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-auto",
        deviceMode === "desktop" && "bg-background",
        (deviceMode === "tablet" || deviceMode === "mobile") && "bg-muted/30 p-4"
      )}
    >
      <div
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          deviceMode === "desktop" && "w-full",
          deviceMode === "tablet" && "w-[768px] mx-auto",
          deviceMode === "mobile" && "w-[375px] mx-auto"
        )}
      >
        {/* Preview Frame */}
        <div
          className={cn(
            "h-full bg-background overflow-hidden",
            deviceMode === "tablet" && "rounded-[1.5rem] border shadow-2xl",
            deviceMode === "mobile" && "rounded-[2rem] border shadow-2xl"
          )}
        >
          {children || <PreviewPlaceholder deviceMode={deviceMode} />}
        </div>
      </div>
    </div>
  );
}

function PreviewPlaceholder({ deviceMode }: { deviceMode: DeviceMode }) {
  const icons = { desktop: "🖥️", tablet: "📱", mobile: "📱" };
  const labels = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <div className="text-4xl mb-4">{icons[deviceMode]}</div>
        <p className="text-sm">Bridge preview will appear here</p>
        <p className="text-xs mt-1">{labels[deviceMode]} view</p>
      </div>
    </div>
  );
}

export type { DeviceMode };
