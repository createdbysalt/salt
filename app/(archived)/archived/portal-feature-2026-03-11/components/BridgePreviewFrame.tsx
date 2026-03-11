"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@repo/utils";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { ViewingAsBar } from "./ViewingAsBar";
import type { PreviewDevice, DeviceDimensions } from "../hooks/usePreviewDevice";

interface BridgePreviewFrameProps {
  clientId: string;
  clientName: string;
  device: PreviewDevice;
  dimensions: DeviceDimensions;
  onExitPreview: () => void;
  className?: string;
}

/**
 * BridgePreviewFrame - Live iframe preview of client portal
 *
 * Features:
 * - Responsive device preview (desktop/tablet/mobile)
 * - Loading state with skeleton
 * - Error handling with retry
 * - Impersonation banner
 */
export function BridgePreviewFrame({
  clientId,
  clientName,
  device,
  dimensions,
  onExitPreview,
  className,
}: BridgePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Preview URL - uses dedicated preview route (outside dashboard layout)
  // This renders the Bridge portal with BridgeSurfaceProvider for accurate light-mode preview
  const previewUrl = `/portal-preview/${clientId}`;

  // Handle iframe load events
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Retry loading the iframe
  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount((c) => c + 1);
  };

  // Reset loading state when client changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [clientId]);

  // Calculate frame size based on device
  const getFrameStyles = () => {
    if (device === "desktop") {
      return {
        width: "100%",
        height: "100%",
        maxWidth: "none",
      };
    }

    return {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      maxWidth: "100%",
    };
  };

  const frameStyles = getFrameStyles();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Impersonation Banner */}
      <ViewingAsBar clientName={clientName} onExit={onExitPreview} />

      {/* Preview Container */}
      <div
        className={cn(
          "flex-1 overflow-auto bg-muted/30",
          "flex items-start justify-center",
          device !== "desktop" && "p-4"
        )}
      >
        <div
          className={cn(
            "relative bg-background rounded-b-lg overflow-hidden",
            "border border-t-0 border-border",
            "shadow-lg transition-all duration-300",
            device !== "desktop" && "rounded-lg border-t"
          )}
          style={frameStyles}
        >
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-background">
              <BridgePreviewSkeleton />
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 z-10 bg-background flex items-center justify-center">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load preview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The client portal couldn&apos;t be loaded.
                </p>
                <Button onClick={handleRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Iframe */}
          <iframe
            ref={iframeRef}
            key={`${clientId}-${retryCount}`}
            src={previewUrl}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            title={`Portal preview for ${clientName}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the preview frame
 */
function BridgePreviewSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Content Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>

      {/* More content */}
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

/**
 * Empty state when no client is selected
 */
export function BridgePreviewEmpty() {
  return (
    <div className="flex flex-col h-full items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
      <div className="text-center p-8 max-w-md">
        <div className="rounded-full bg-primary/10 p-4 mx-auto mb-4 w-fit">
          <svg
            className="h-12 w-12 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Select a client to preview</h3>
        <p className="text-sm text-muted-foreground">
          Choose a client from the list to see exactly what they see in their portal.
        </p>
      </div>
    </div>
  );
}
