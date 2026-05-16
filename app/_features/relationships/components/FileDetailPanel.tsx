"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Button,
  Badge,
  Textarea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  X,
  Download,
  Trash2,
  ExternalLink,
  Sparkles,
  Check,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Plus,
  Loader2,
  Eye,
  Link2,
  Youtube,
  Figma,
  FileCode,
} from "lucide-react";
import type { ClientFile, FileTag } from "@/app/actions/files/get-client-files";
import { getFilePreviewUrl } from "@/app/actions/files/update-client-file";
import { formatFileSize, getFileTypeName } from "../lib/file-validation";
import { FilePreviewModal } from "./FilePreviewModal";
import { AlertCircle } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface FileDetailPanelProps {
  file: ClientFile;
  onClose: () => void;
  onDelete?: (fileId: string) => Promise<void>;
  onDownload?: (fileId: string) => Promise<void>;
  onUpdateDescription?: (fileId: string, description: string) => Promise<void>;
  onUpdateDirection?: (fileId: string, direction: "from_client" | "to_client" | "internal") => Promise<void>;
  onUpdateProject?: (fileId: string, projectId: string | null) => Promise<void>;
  onAddTag?: (fileId: string, tagId: string) => Promise<void>;
  onRemoveTag?: (fileId: string, tagId: string) => Promise<void>;
  projects?: Array<{ id: string; name: string }>;
  availableTags?: FileTag[];
  className?: string;
}

// Helper to check if file is previewable
function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "text/csv"
  );
}

function getFileIcon(mimeType: string | null, size: "sm" | "lg" = "sm") {
  const sizeClass = size === "lg" ? "size-8" : "size-5";
  if (!mimeType) return <File className={cn(sizeClass, "text-muted-foreground")} />;

  // Link types
  if (mimeType === "video/youtube" || mimeType === "video/vimeo" || mimeType === "video/loom") {
    return <Youtube className={cn(sizeClass, "text-destructive")} />;
  }
  if (mimeType === "application/figma") {
    return <Figma className={cn(sizeClass, "text-accent")} />;
  }
  if (mimeType === "application/github" || mimeType === "application/gitlab") {
    return <FileCode className={cn(sizeClass, "text-muted-foreground")} />;
  }
  if (mimeType.startsWith("application/") && (
    mimeType.includes("google-drive") ||
    mimeType.includes("dropbox") ||
    mimeType.includes("onedrive") ||
    mimeType.includes("notion") ||
    mimeType.includes("miro") ||
    mimeType.includes("canva") ||
    mimeType.includes("sketch") ||
    mimeType === "application/link"
  )) {
    return <Link2 className={cn(sizeClass, "text-info")} />;
  }

  // Regular file types
  if (mimeType.startsWith("image/")) {
    return <FileImage className={cn(sizeClass, "text-muted-foreground")} />;
  }
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType === "text/plain" || mimeType === "text/markdown") {
    return <FileText className={cn(sizeClass, "text-muted-foreground")} />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return <FileSpreadsheet className={cn(sizeClass, "text-muted-foreground")} />;
  }
  return <File className={cn(sizeClass, "text-muted-foreground")} />;
}

// =============================================================================
// Main Component
// =============================================================================

export function FileDetailPanel({
  file,
  onClose,
  onDelete,
  onDownload,
  onUpdateDescription,
  onUpdateDirection,
  onUpdateProject,
  onAddTag,
  onRemoveTag,
  projects = [],
  availableTags = [],
  className,
}: FileDetailPanelProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(file.description || "");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const isImage = file.mimeType?.startsWith("image/");

  // Sync description with file prop when file changes
  useEffect(() => {
    setDescription(file.description || "");
    setIsEditingDescription(false);
  }, [file.id, file.description]);

  // Load preview URL for previewable files
  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      if (!isPreviewable(file.mimeType)) {
        setPreviewUrl(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const result = await getFilePreviewUrl(file.id);
        if (isMounted && result.success && result.url) {
          setPreviewUrl(result.url);
        }
      } catch (error) {
        console.error("Error loading preview:", error);
      } finally {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      }
    }

    loadPreview();
    return () => { isMounted = false; };
  }, [file.id, file.mimeType]);

  const handleSaveDescription = async () => {
    if (!onUpdateDescription) return;
    setIsSavingDescription(true);
    try {
      await onUpdateDescription(file.id, description);
      setIsEditingDescription(false);
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(file.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!onDownload) return;
    setIsDownloading(true);
    try {
      await onDownload(file.id);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDirectionChange = async (direction: "from_client" | "to_client" | "internal") => {
    if (!onUpdateDirection) return;
    setIsSavingDirection(true);
    try {
      await onUpdateDirection(file.id, direction);
    } finally {
      setIsSavingDirection(false);
    }
  };

  const handleProjectChange = async (projectId: string) => {
    if (!onUpdateProject) return;
    setIsSavingProject(true);
    try {
      await onUpdateProject(file.id, projectId === "none" ? null : projectId);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!onAddTag) return;
    setIsAddingTag(true);
    try {
      await onAddTag(file.id, tagId);
    } finally {
      setIsAddingTag(false);
    }
  };

  const unassignedTags = availableTags.filter(
    (tag) => !file.tags.some((t) => t.id === tag.id)
  );

  return (
    <>
      <FilePreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        previewUrl={previewUrl}
        fileName={file.fileName}
        mimeType={file.mimeType}
        onDownload={handleDownload}
        isLoading={isLoadingPreview}
      />

      <div className={cn("flex flex-col h-full bg-card/50", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <h3 className="text-sm font-medium">Properties</h3>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-4 pt-4">
            {/* Image Preview */}
            {isImage && (
              <div
                className="relative aspect-video rounded-lg bg-muted overflow-hidden cursor-pointer group"
                onClick={() => setShowPreviewModal(true)}
              >
                {isLoadingPreview ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : previewUrl ? (
                  <>
                    <img src={previewUrl} alt={file.fileName} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="sm">
                          <Eye className="size-4 mr-1.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileImage className="size-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            )}

            {/* Non-image file icon */}
            {!isImage && (
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {getFileIcon(file.mimeType, "lg")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm break-words">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getFileTypeName(file.mimeType, file.fileName)}{file.sizeBytes ? ` • ${formatFileSize(file.sizeBytes)}` : ""} • {format(new Date(file.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}

            {/* File Info for images - Left aligned */}
            {isImage && (
              <div>
                <p className="font-medium text-sm break-words">{file.fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getFileTypeName(file.mimeType, file.fileName)}{file.sizeBytes ? ` • ${formatFileSize(file.sizeBytes)}` : ""} • {format(new Date(file.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            )}

            {/* Description - Inline Editable */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[60px] text-sm resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsEditingDescription(false);
                        setDescription(file.description || "");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveDescription}
                      disabled={isSavingDescription}
                    >
                      {isSavingDescription ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    "text-sm p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    !file.description && "text-muted-foreground italic"
                  )}
                  onClick={() => onUpdateDescription && setIsEditingDescription(true)}
                >
                  {file.description || "Add description..."}
                </p>
              )}
            </div>

            {/* AI Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">AI Summary</p>
                {file.aiStatus === "completed" && (
                  <Check className="size-3.5 text-muted-foreground" />
                )}
                {(file.aiStatus === "processing" || file.aiStatus === "pending" || !file.aiStatus) && (
                  <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
                )}
              </div>

              {/* Completed - Show summary */}
              {file.aiStatus === "completed" && file.aiSummary && (
                <div className="text-xs text-foreground p-3 rounded-md bg-muted/50 whitespace-pre-wrap">
                  {file.aiSummary}
                </div>
              )}

              {/* Processing/Pending - Show loading */}
              {(file.aiStatus === "processing" || file.aiStatus === "pending" || !file.aiStatus) && (
                <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/50 min-h-[60px] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span>Analyzing file content...</span>
                </div>
              )}

              {/* Failed - Show error */}
              {file.aiStatus === "failed" && (
                <div className="text-xs p-3 rounded-md bg-destructive/5 border border-destructive/20 min-h-[60px]">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-destructive font-medium">Summary generation failed</p>
                      <p className="text-muted-foreground mt-1">{file.aiError || "Unknown error occurred"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Unsupported - Show message */}
              {file.aiStatus === "unsupported" && (
                <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/50 min-h-[60px] flex items-center">
                  AI summary is not available for this file type. Supported: text, markdown, images, and links.
                </div>
              )}
            </div>

            {/* Metadata Fields - Compact */}
            <div className="space-y-3">
              {/* Direction */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Direction</p>
                {onUpdateDirection ? (
                  <Select value={file.direction} onValueChange={handleDirectionChange} disabled={isSavingDirection}>
                    <SelectTrigger className="w-[140px] h-7 text-xs">
                      {isSavingDirection ? <Loader2 className="size-3 animate-spin" /> : <SelectValue />}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">
                        <span className="flex items-center gap-1.5"><Lock className="size-3" /> Internal</span>
                      </SelectItem>
                      <SelectItem value="to_client">
                        <span className="flex items-center gap-1.5"><ArrowUpRight className="size-3" /> Sent</span>
                      </SelectItem>
                      <SelectItem value="from_client">
                        <span className="flex items-center gap-1.5"><ArrowDownLeft className="size-3" /> Received</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">{file.direction}</span>
                )}
              </div>

              {/* Project */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                {onUpdateProject ? (
                  <div className="flex items-center gap-1">
                    <Select value={file.projectId || "none"} onValueChange={handleProjectChange} disabled={isSavingProject}>
                      <SelectTrigger className="w-[140px] h-7 text-xs">
                        {isSavingProject ? <Loader2 className="size-3 animate-spin" /> : <SelectValue placeholder="None" />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {file.projectId && (
                      <Link href={`/studio/projects/${file.projectId}`} className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="size-3.5" />
                      </Link>
                    )}
                  </div>
                ) : file.projectName ? (
                  <Link href={`/studio/projects/${file.projectId}`} className="text-xs text-primary hover:underline">
                    {file.projectName}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>

              {/* Tags */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Tags</p>
                {onAddTag && unassignedTags.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" disabled={isAddingTag}>
                        {isAddingTag ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                        Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1.5" align="end">
                      {unassignedTags.map((tag) => (
                        <button
                          key={tag.id}
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted"
                          onClick={() => handleAddTag(tag.id)}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {file.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {file.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs font-normal pr-1">
                      {tag.label}
                      {onRemoveTag && (
                        <button onClick={() => onRemoveTag(file.id, tag.id)} className="ml-1 hover:text-foreground">
                          <X className="size-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">None</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed at Bottom */}
        <div className="shrink-0 p-3 border-t border-border/60 space-y-2">
          {/* Preview button for previewable files */}
          {file.fileType !== "link" && isPreviewable(file.mimeType) && (
            <Button className="w-full h-9" onClick={() => setShowPreviewModal(true)} disabled={isLoadingPreview}>
              {isLoadingPreview ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              View
            </Button>
          )}

          {/* Open Link button for links */}
          {file.fileType === "link" && file.externalUrl && (
            <Button
              className="w-full h-9"
              onClick={() => window.open(file.externalUrl!, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="size-4" />
              Open Link
            </Button>
          )}

          {/* Download button for files only */}
          {file.fileType !== "link" && (
            <Button variant="outline" className="w-full h-9" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download
            </Button>
          )}

          {/* Copy Link button for links */}
          {file.fileType === "link" && file.externalUrl && (
            <Button
              variant="outline"
              className="w-full h-9"
              onClick={() => {
                navigator.clipboard.writeText(file.externalUrl!);
              }}
            >
              <Link2 className="size-4" />
              Copy Link
            </Button>
          )}

          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {file.fileType === "link" ? "link" : "file"} permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{file.fileName}"{file.fileType !== "link" && " from storage"}. This cannot be undone.
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
      </div>
    </>
  );
}
