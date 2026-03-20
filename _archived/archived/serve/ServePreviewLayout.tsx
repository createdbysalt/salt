"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@repo/utils";
import { usePreviewDevice } from "@/app/_features/portal/hooks/usePreviewDevice";
import { useServeShortcuts } from "@/app/_features/shell/hooks/useServeShortcuts";
import { Button } from "@/app/_components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  Monitor,
  Tablet,
  Smartphone,
  Settings,
  ExternalLink,
  Eye,
  Keyboard,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  contact_email: string | null;
}

interface ServePreviewLayoutProps {
  clients: Client[];
}

const GENERIC_PREVIEW_ID = "__generic__";

/**
 * ServePreviewLayout - Simplified canvas-focused preview
 *
 * Design principles:
 * - Preview dominates the screen (Webflow-style)
 * - Minimal toolbar with client dropdown + device controls
 * - Works with zero clients (generic preview mode)
 * - No sidebar panels competing for attention
 */
export function ServePreviewLayout({ clients }: ServePreviewLayoutProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(GENERIC_PREVIEW_ID);
  const [isLoading, setIsLoading] = useState(true);
  const { device, setDevice } = usePreviewDevice();

  // Get selected client info
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const viewingAsLabel = selectedClient ? selectedClient.name : "Generic Preview";

  // Determine preview URL
  const previewUrl = selectedClientId === GENERIC_PREVIEW_ID
    ? "/portal-preview/generic"
    : `/portal-preview/${selectedClientId}`;

  // Open preview in new tab
  const handleOpenPreview = useCallback(() => {
    window.open(previewUrl, "_blank");
  }, [previewUrl]);

  // Keyboard shortcuts
  const { selectTriggerRef } = useServeShortcuts({
    clients,
    selectedClientId,
    onSelectClient: setSelectedClientId,
    onOpenPreview: handleOpenPreview,
    onSetDevice: setDevice,
    genericPreviewId: GENERIC_PREVIEW_ID,
  });

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Reset loading state when client changes
  useEffect(() => {
    setIsLoading(true);
  }, [selectedClientId]);

  // Device button helper
  const DeviceButton = ({
    deviceType,
    icon: Icon,
    label,
  }: {
    deviceType: "desktop" | "tablet" | "mobile";
    icon: typeof Monitor;
    label: string;
  }) => (
    <Button
      variant={device === deviceType ? "secondary" : "ghost"}
      size="sm"
      onClick={() => setDevice(deviceType)}
      className="h-8 px-2"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Minimal Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left: View Mode Label + Client Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Viewing as:</span>
          </div>

          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger ref={selectTriggerRef} className="w-[200px] h-8">
              <SelectValue placeholder="Select view..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERIC_PREVIEW_ID}>
                <span className="text-muted-foreground">Generic Preview</span>
              </SelectItem>
              {clients.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                    Your Clients
                  </div>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Center: Device Controls */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
          <DeviceButton deviceType="desktop" icon={Monitor} label="Desktop view" />
          <DeviceButton deviceType="tablet" icon={Tablet} label="Tablet view" />
          <DeviceButton deviceType="mobile" icon={Smartphone} label="Mobile view" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={handleOpenPreview}
            title="Open in new tab (P)"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Open</span>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-medium mb-2">Keyboard Shortcuts</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span><kbd className="px-1 bg-muted rounded">C</kbd> Client switcher</span>
                    <span><kbd className="px-1 bg-muted rounded">P</kbd> Open in new tab</span>
                    <span><kbd className="px-1 bg-muted rounded">D</kbd> Desktop view</span>
                    <span><kbd className="px-1 bg-muted rounded">T</kbd> Tablet view</span>
                    <span><kbd className="px-1 bg-muted rounded">M</kbd> Mobile view</span>
                    <span><kbd className="px-1 bg-muted rounded">1-9</kbd> Select client</span>
                    <span><kbd className="px-1 bg-muted rounded">0</kbd> Generic preview</span>
                    <span><kbd className="px-1 bg-muted rounded">Esc</kbd> Reset view</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/serve/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Preview Canvas - Takes ALL remaining space */}
      <div className="flex-1 relative bg-muted/30 overflow-hidden">
        {/* Device Frame Container */}
        <div
          className={cn(
            "h-full w-full flex items-start justify-center",
            device !== "desktop" && "p-6 overflow-auto"
          )}
        >
          <div
            className={cn(
              "bg-background overflow-hidden transition-all duration-300 shadow-2xl",
              device === "desktop" && "w-full h-full",
              device === "tablet" && "w-[768px] h-[1024px] rounded-xl border max-h-full",
              device === "mobile" && "w-[375px] h-[667px] rounded-2xl border max-h-full"
            )}
            style={device !== "desktop" ? { maxHeight: "calc(100vh - 10rem)" } : undefined}
          >
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-10 bg-background flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-pulse bg-muted rounded h-8 w-32 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            )}

            {/* Iframe Preview */}
            <iframe
              key={selectedClientId}
              src={previewUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              title={`Portal preview - ${viewingAsLabel}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        </div>

        {/* Subtle "Viewing as" indicator at bottom (for non-generic) */}
        {selectedClient && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-full text-sm shadow-lg">
            Viewing as <span className="font-medium">{selectedClient.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
