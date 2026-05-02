"use client";

import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Sparkles,
  Loader2,
  Link2,
  Trash2,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";

import type { BridgeFile } from "@/app/_lib/table/queries";
import { getBridgeFilePreviewUrl, deleteBridgeFile } from "../actions";

// ============================================================================
// Types
// ============================================================================

interface TableFileDetailPanelProps {
  file: BridgeFile | null;
  onClose: () => void;
  onDownload: (_file: BridgeFile) => void;
  currentUserId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getFileIcon(mimeType: string | null, fileType: "file" | "link" = "file") {
  const className = "size-8 text-muted-foreground";

  if (fileType === "link") {
    return <Link2 className={cn(className, "text-primary")} />;
  }

  if (!mimeType) return <File className={className} />;

  if (mimeType.startsWith("image/")) {
    return <FileImage className={className} />;
  }
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType === "text/plain") {
    return <FileText className={className} />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return <FileSpreadsheet className={className} />;
  }
  return <File className={className} />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf"
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TableFileDetailPanel({
  file,
  onClose,
  onDownload,
  currentUserId,
}: TableFileDetailPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isImage = file?.mimeType?.startsWith("image/");
  const canDelete = file?.uploadedBy === currentUserId;

  // Load preview when file changes
  React.useEffect(() => {
    if (!file || !isPreviewable(file.mimeType)) {
      setPreviewUrl(null);
      return;
    }

    let isMounted = true;
    setIsLoadingPreview(true);

    getBridgeFilePreviewUrl(file.id)
      .then((result) => {
        if (isMounted && result.success && result.url) {
          setPreviewUrl(result.url);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, file?.mimeType]);

  const handleDownload = async () => {
    if (!file) return;
    setIsDownloading(true);
    try {
      await onDownload(file);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!file) return;
    setIsDeleting(true);
    try {
      const result = await deleteBridgeFile(file.id);
      if (result.success) {
        onClose();
        // Page will revalidate automatically
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <Sheet open={!!file} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0" data-surface="table">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">File Details</SheetTitle>
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Preview (images only) */}
          {isImage && (
            <div className="relative aspect-video rounded-lg bg-muted overflow-hidden">
              {isLoadingPreview ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={file.fileName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileImage className="size-12 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )}

          {/* File info */}
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {getFileIcon(file.mimeType, file.fileType)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{file.fileName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {file.sizeBytes ? formatFileSize(file.sizeBytes) : "Link"}
                {" · "}
                {format(new Date(file.createdAt), "MMM d, yyyy")}
              </p>
              {file.projectName && (
                <p className="text-sm text-muted-foreground">
                  {file.projectName}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {file.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {file.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {file.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{file.description}</p>
            </div>
          )}

          {/* AI Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">AI Summary</p>
              {file.aiStatus === "completed" && (
                <Check className="size-4 text-muted-foreground" />
              )}
              {(file.aiStatus === "processing" || file.aiStatus === "pending" || !file.aiStatus) && (
                <Loader2 className="size-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {file.aiStatus === "completed" && file.aiSummary && (
              <div className="text-sm p-3 rounded-lg bg-muted/50 whitespace-pre-wrap">
                {file.aiSummary}
              </div>
            )}

            {(file.aiStatus === "processing" || file.aiStatus === "pending" || !file.aiStatus) && (
              <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50 flex flex-col items-center justify-center gap-2 min-h-[80px]">
                <Loader2 className="size-5 animate-spin" />
                <span>Analyzing file...</span>
              </div>
            )}

            {file.aiStatus === "failed" && (
              <div className="text-sm p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Summary unavailable</span>
              </div>
            )}

            {file.aiStatus === "unsupported" && (
              <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                AI summary is not available for this file type.
              </div>
            )}
          </div>

          {/* Uploaded by */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Uploaded by</p>
            <p className="text-sm">{file.uploadedByName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t space-y-2">
          {/* Primary action */}
          {file.fileType === "link" ? (
            <Button
              className="w-full"
              onClick={() => window.open(file.externalUrl!, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="size-4" />
              Open Link
            </Button>
          ) : (
            <Button className="w-full" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download
            </Button>
          )}

          {/* Delete (only for own uploads) */}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-surface="table">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete file?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{file.fileName}&quot;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
