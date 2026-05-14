"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui";
import {
  X,
  Download,
  ExternalLink,
  Loader2,
  FileText,
  FileSpreadsheet,
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FolderOpen,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  fileName: string;
  mimeType: string | null;
  onDownload?: () => void;
  isLoading?: boolean;
  /** File ID for "View in Files" link */
  fileId?: string;
  /** Client ID for "View in Files" link */
  clientId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function isPreviewableImage(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

function isPreviewablePdf(mimeType: string | null): boolean {
  return mimeType === "application/pdf";
}

function isPreviewableText(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "text/csv";
}

function getFileTypeIcon(mimeType: string | null) {
  if (!mimeType) return <File className="size-16 text-muted-foreground" />;

  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType === "text/plain") {
    return <FileText className="size-16 text-muted-foreground" />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return <FileSpreadsheet className="size-16 text-muted-foreground" />;
  }
  return <File className="size-16 text-muted-foreground" />;
}

// =============================================================================
// Main Component
// =============================================================================

export function FilePreviewModal({
  open,
  onOpenChange,
  previewUrl,
  fileName,
  mimeType,
  onDownload,
  isLoading = false,
  fileId,
  clientId,
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  // Reset zoom and rotation when modal opens/closes
  useEffect(() => {
    if (!open) {
      setZoom(1);
      setRotation(0);
      setTextContent(null);
    }
  }, [open]);

  // Fetch text content for markdown/text files
  useEffect(() => {
    if (!open || !previewUrl || !isPreviewableText(mimeType)) {
      return;
    }

    let isMounted = true;
    setIsLoadingText(true);

    fetch(previewUrl)
      .then((res) => res.text())
      .then((text) => {
        if (isMounted) {
          setTextContent(text);
        }
      })
      .catch((err) => {
        console.error("Error fetching text content:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingText(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, previewUrl, mimeType]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const canPreview = isPreviewableImage(mimeType) || isPreviewablePdf(mimeType) || isPreviewableText(mimeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-medium truncate pr-4">
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isPreviewableImage(mimeType) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleRotate}
                >
                  <RotateCw className="size-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}
            {onDownload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onDownload}
                  >
                    <Download className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            )}
            {previewUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => window.open(previewUrl, "_blank")}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in new tab</TooltipContent>
              </Tooltip>
            )}
            {fileId && clientId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    asChild
                  >
                    <Link
                      href={`/studio/clients/${clientId}?tab=files&fileId=${fileId}`}
                      onClick={() => onOpenChange(false)}
                    >
                      <FolderOpen className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View in Files</TooltipContent>
              </Tooltip>
            )}
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : !previewUrl ? (
            <div className="flex flex-col items-center gap-3 p-8">
              {getFileTypeIcon(mimeType)}
              <p className="text-sm text-muted-foreground">Preview not available</p>
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="size-4 mr-2" />
                  Download to view
                </Button>
              )}
            </div>
          ) : isPreviewableImage(mimeType) ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={previewUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          ) : isPreviewablePdf(mimeType) ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
              <FileText className="size-16 text-muted-foreground" />
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                PDF preview is not available in the browser due to security restrictions.
              </p>
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={() => window.open(previewUrl, "_blank")}>
                  <ExternalLink className="size-4 mr-2" />
                  Open in new tab
                </Button>
                {onDownload && (
                  <Button variant="outline" size="sm" onClick={onDownload}>
                    <Download className="size-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          ) : isPreviewableText(mimeType) ? (
            isLoadingText ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading content...</p>
              </div>
            ) : textContent ? (
              <div className="w-full h-full overflow-auto">
                <div className="min-h-full bg-zinc-100 dark:bg-zinc-950 p-6">
                  <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-300">
                    {textContent}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-8">
                <FileText className="size-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Failed to load content</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 p-8">
              {getFileTypeIcon(mimeType)}
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                This file type cannot be previewed in the browser
              </p>
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="size-4 mr-2" />
                  Download to view
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
