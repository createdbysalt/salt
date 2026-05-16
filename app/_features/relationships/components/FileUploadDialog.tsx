"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Progress,
  Badge,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  Upload,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Link2,
  ExternalLink,
} from "lucide-react";
import {
  validateFile,
  FILE_TYPE_CATEGORIES,
  ALLOWED_EXTENSIONS,
  formatFileSize,
  MAX_FILE_SIZE_DISPLAY,
} from "../lib/file-validation";
import { uploadClientFile, createClientLink } from "@/app/actions/files/upload-client-file";
import type { FileTag } from "@/app/actions/files/get-client-files";

type DialogMode = "file" | "link";

// =============================================================================
// Types
// =============================================================================

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  projects: Array<{ id: string; name: string }>;
  availableTags: FileTag[];
  onUploadComplete?: () => void;
}

interface SelectedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  previewUrl?: string; // For image previews
  // Per-file metadata
  projectId?: string;
  direction?: FileDirection;
  tagIds?: string[];
  description?: string;
}

type FileDirection = "from_client" | "to_client" | "internal";

// =============================================================================
// File Type Icon
// =============================================================================

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (["pdf", "doc", "docx", "txt", "md"].includes(ext || "")) {
    return <FileText className="size-5 text-muted-foreground" />;
  }
  if (["xlsx", "xls", "csv"].includes(ext || "")) {
    return <FileSpreadsheet className="size-5 text-muted-foreground" />;
  }
  if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
    return <FileImage className="size-5 text-muted-foreground" />;
  }
  return <File className="size-5 text-muted-foreground" />;
}

// =============================================================================
// Category Icon
// =============================================================================

function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "FileText":
      return <FileText className="size-4" />;
    case "FileSpreadsheet":
      return <FileSpreadsheet className="size-4" />;
    case "FileImage":
      return <FileImage className="size-4" />;
    default:
      return <File className="size-4" />;
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function FileUploadDialog({
  open,
  onOpenChange,
  clientId,
  projects,
  availableTags,
  onUploadComplete,
}: FileUploadDialogProps) {
  // Dialog mode: file upload or link
  const [mode, setMode] = useState<DialogMode>("file");

  // File upload state
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Link state
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // Metadata state (shared between modes)
  const [selectedProject, setSelectedProject] = useState<string>("none");
  const [selectedDirection, setSelectedDirection] = useState<FileDirection>("internal");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [applyToAll, setApplyToAll] = useState(true);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Revoke all preview URLs to avoid memory leaks
      setFiles((prev) => {
        prev.forEach((f) => {
          if (f.previewUrl) {
            URL.revokeObjectURL(f.previewUrl);
          }
        });
        return [];
      });
      setMode("file");
      setDragActive(false);
      setIsUploading(false);
      setLinkName("");
      setLinkUrl("");
      setIsCreatingLink(false);
      setSelectedProject("none");
      setSelectedDirection("internal");
      setSelectedTags([]);
      setDescription("");
      setApplyToAll(true);
    }
  }, [open]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: SelectedFile[] = [];

    Array.from(fileList).forEach((file) => {
      const validation = validateFile(file);

      // Create preview URL for images
      let previewUrl: string | undefined;
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      newFiles.push({
        file,
        id: crypto.randomUUID(),
        status: validation.valid ? "pending" : "error",
        progress: 0,
        error: validation.error,
        previewUrl,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Update per-file metadata
  const updateFileMetadata = (id: string, updates: Partial<Pick<SelectedFile, "projectId" | "direction" | "tagIds" | "description">>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status === "pending");
    if (validFiles.length === 0) return;

    setIsUploading(true);

    for (const fileItem of validFiles) {
      // Set uploading status
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: "uploading" as const, progress: 10 } : f
        )
      );

      try {
        // Create FormData with the file
        const formData = new FormData();
        formData.append("file", fileItem.file);

        // Determine metadata source: global (applyToAll) or per-file
        const useGlobalMeta = applyToAll || validFiles.length === 1;

        // Get project ID
        const fileProjectId = useGlobalMeta
          ? (selectedProject !== "none" ? selectedProject : undefined)
          : (fileItem.projectId && fileItem.projectId !== "none" ? fileItem.projectId : undefined);

        // Get direction
        const fileDirection = useGlobalMeta
          ? selectedDirection
          : (fileItem.direction || "internal");

        // Get description
        const fileDescription = useGlobalMeta
          ? (description.trim() || undefined)
          : (fileItem.description?.trim() || undefined);

        // Get tags
        const fileTags = useGlobalMeta
          ? (selectedTags.length > 0 ? selectedTags : undefined)
          : (fileItem.tagIds && fileItem.tagIds.length > 0 ? fileItem.tagIds : undefined);

        const result = await uploadClientFile(formData, {
          clientId,
          projectId: fileProjectId,
          direction: fileDirection,
          sharedWithClient: fileDirection === "to_client",
          description: fileDescription,
          tagIds: fileTags,
        });

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: "success" as const, progress: 100 }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: "error" as const, error: result.error || "Upload failed" }
                : f
            )
          );
        }
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "error" as const, error: "Upload failed" }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    // Close dialog and refresh after short delay
    setTimeout(() => {
      onOpenChange(false);
      onUploadComplete?.();
    }, 800);
  };

  const validFilesCount = files.filter((f) => f.status === "pending").length;
  const hasErrors = files.some((f) => f.status === "error");

  // Handle link creation
  const handleCreateLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;

    setIsCreatingLink(true);

    try {
      const result = await createClientLink({
        clientId,
        name: linkName.trim(),
        url: linkUrl.trim(),
        projectId: selectedProject !== "none" ? selectedProject : undefined,
        direction: selectedDirection,
        sharedWithClient: selectedDirection === "to_client",
        description: description.trim() || undefined,
        tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      });

      if (result.success) {
        setTimeout(() => {
          onOpenChange(false);
          onUploadComplete?.();
        }, 300);
      } else {
        console.error("Link creation failed:", result.error);
      }
    } catch (error) {
      console.error("Link creation error:", error);
    } finally {
      setIsCreatingLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Files</DialogTitle>
          <DialogDescription>
            Upload files or save links to external resources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-lg border bg-muted/50 p-1">
            <button
              type="button"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                mode === "file"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setMode("file")}
            >
              <Upload className="size-4" />
              Upload File
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                mode === "link"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setMode("link")}
            >
              <Link2 className="size-4" />
              Add Link
            </button>
          </div>

          {/* File Upload Mode */}
          {mode === "file" && (
            <>
              {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/40"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileSelect}
              accept={ALLOWED_EXTENSIONS.join(",")}
            />
            <div className="text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Upload className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max file size: {MAX_FILE_SIZE_DISPLAY}
              </p>
            </div>
          </div>

          {/* Accepted File Types */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Accepted file types
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FILE_TYPE_CATEGORIES.map((category) => (
                <div
                  key={category.name}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                >
                  <div className="text-muted-foreground mt-0.5">
                    {getCategoryIcon(category.icon)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {category.extensions.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Selected files ({files.length})
                </p>
                {validFilesCount > 1 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={applyToAll}
                      onCheckedChange={(checked) => setApplyToAll(!!checked)}
                    />
                    Apply same properties to all
                  </label>
                )}
              </div>
              <div className={cn("space-y-2 overflow-y-auto", !applyToAll && validFilesCount > 1 ? "max-h-[320px]" : "max-h-48")}>
                {files.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-md border",
                      item.status === "error"
                        ? "border-destructive/50 bg-destructive/5"
                        : item.status === "success"
                        ? "border-success/50 bg-success/5"
                        : "border-border bg-muted/30"
                    )}
                  >
                    {/* File Header */}
                    <div className="flex items-center gap-3 p-2">
                      {item.previewUrl ? (
                        <div className="size-10 rounded overflow-hidden shrink-0 bg-muted">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0">
                          {getFileIcon(item.file.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(item.file.size)}
                          </span>
                          {item.status === "error" && (
                            <span className="text-xs text-destructive">
                              {item.error}
                            </span>
                          )}
                          {item.status === "uploading" && (
                            <Progress value={item.progress} className="h-1 w-20" />
                          )}
                        </div>
                      </div>
                      {item.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          onClick={() => removeFile(item.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                      )}
                      {item.status === "success" && (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      )}
                      {item.status === "error" && (
                        <AlertCircle className="size-4 shrink-0 text-destructive" />
                      )}
                    </div>

                    {/* Per-file metadata (only when applyToAll is off and there are multiple valid files) */}
                    {!applyToAll && validFilesCount > 1 && item.status === "pending" && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Project */}
                          <Select
                            value={item.projectId || "none"}
                            onValueChange={(v) => updateFileMetadata(item.id, { projectId: v === "none" ? undefined : v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No project</SelectItem>
                              {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Direction */}
                          <Select
                            value={item.direction || "internal"}
                            onValueChange={(v) => updateFileMetadata(item.id, { direction: v as FileDirection })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="internal">Internal</SelectItem>
                              <SelectItem value="to_client">Sent to client</SelectItem>
                              <SelectItem value="from_client">From client</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Tags */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full h-8 justify-between text-xs font-normal"
                            >
                              {!item.tagIds || item.tagIds.length === 0 ? (
                                <span className="text-muted-foreground">Select tags</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {item.tagIds.slice(0, 2).map((tagId) => {
                                    const tag = availableTags.find((t) => t.id === tagId);
                                    return tag ? (
                                      <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {tag.label}
                                      </Badge>
                                    ) : null;
                                  })}
                                  {item.tagIds.length > 2 && (
                                    <span className="text-muted-foreground">+{item.tagIds.length - 2}</span>
                                  )}
                                </div>
                              )}
                              <ChevronDown className="size-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="space-y-1">
                              {availableTags.map((tag) => (
                                <label
                                  key={tag.id}
                                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                                >
                                  <Checkbox
                                    checked={item.tagIds?.includes(tag.id) || false}
                                    onCheckedChange={(checked) => {
                                      const currentTags = item.tagIds || [];
                                      if (checked) {
                                        updateFileMetadata(item.id, { tagIds: [...currentTags, tag.id] });
                                      } else {
                                        updateFileMetadata(item.id, { tagIds: currentTags.filter((id) => id !== tag.id) });
                                      }
                                    }}
                                  />
                                  {tag.label}
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Description */}
                        <Textarea
                          value={item.description || ""}
                          onChange={(e) => updateFileMetadata(item.id, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="min-h-[60px] text-xs resize-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact Metadata Row - Only show when applyToAll is true or single file */}
          {files.length > 0 && (applyToAll || validFilesCount <= 1) && (
            <div className="grid grid-cols-4 gap-2 pt-2">
              {/* Project */}
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-[34px] w-full px-3 py-0 text-xs border-dashed justify-center [&>svg:last-child]:size-3">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Direction */}
              <Select
                value={selectedDirection}
                onValueChange={(v) => setSelectedDirection(v as FileDirection)}
              >
                <SelectTrigger className="h-[34px] w-full px-3 py-0 text-xs border-dashed justify-center gap-1.5 [&>svg:last-child]:size-3">
                  {selectedDirection === "internal" && <Lock className="size-3" />}
                  {selectedDirection === "to_client" && <ArrowUpRight className="size-3" />}
                  {selectedDirection === "from_client" && <ArrowDownLeft className="size-3" />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="to_client">Sent</SelectItem>
                  <SelectItem value="from_client">Received</SelectItem>
                </SelectContent>
              </Select>

              {/* Tags */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-[34px] w-full px-3 text-xs border border-dashed border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-1.5"
                  >
                    {selectedTags.length === 0 ? (
                      <span className="text-muted-foreground">Tags</span>
                    ) : (
                      <span>Tags ({selectedTags.length})</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    {availableTags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTags([...selectedTags, tag.id]);
                            } else {
                              setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                            }
                          }}
                        />
                        {tag.label}
                      </label>
                    ))}
                    {availableTags.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No tags available
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Description toggle */}
              <button
                type="button"
                className={cn(
                  "h-[34px] w-full px-3 text-xs border border-dashed border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center",
                  !description && "text-muted-foreground"
                )}
                onClick={() => setDescription(description ? "" : " ")}
              >
                {description ? <>Note <Check className="size-3 ml-1" /></> : "Note"}
              </button>
            </div>
          )}

          {/* Description - only show when user clicked "+ Note" */}
          {files.length > 0 && (applyToAll || validFilesCount <= 1) && description && (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note..."
              className="min-h-[60px] text-sm resize-none"
              autoFocus
            />
          )}

          {/* Actions - File Mode */}
          {mode === "file" && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validFilesCount === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload {validFilesCount > 0 && `(${validFilesCount})`}
                  </>
                )}
              </Button>
            </div>
          )}
            </>
          )}

          {/* Link Mode */}
          {mode === "link" && (
            <>
              {/* Link Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="e.g., Brand Guidelines (Figma)"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">URL</label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Google Drive, Figma, YouTube, Notion, Dropbox, etc.
                  </p>
                </div>

                {/* Compact Metadata Row */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {/* Project */}
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="h-[34px] w-full px-3 py-0 text-xs border-dashed justify-center [&>svg:last-child]:size-3">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Direction */}
                  <Select
                    value={selectedDirection}
                    onValueChange={(v) => setSelectedDirection(v as FileDirection)}
                  >
                    <SelectTrigger className="h-[34px] w-full px-3 py-0 text-xs border-dashed justify-center gap-1.5 [&>svg:last-child]:size-3">
                      {selectedDirection === "internal" && <Lock className="size-3" />}
                      {selectedDirection === "to_client" && <ArrowUpRight className="size-3" />}
                      {selectedDirection === "from_client" && <ArrowDownLeft className="size-3" />}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="to_client">Shared</SelectItem>
                      <SelectItem value="from_client">Received</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Tags */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-[34px] w-full px-3 text-xs border border-dashed border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-1.5"
                      >
                        {selectedTags.length === 0 ? (
                          <span className="text-muted-foreground">Tags</span>
                        ) : (
                          <span>Tags ({selectedTags.length})</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        {availableTags.map((tag) => (
                          <label
                            key={tag.id}
                            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={selectedTags.includes(tag.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTags([...selectedTags, tag.id]);
                                } else {
                                  setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                                }
                              }}
                            />
                            {tag.label}
                          </label>
                        ))}
                        {availableTags.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No tags available
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Description toggle */}
                  <button
                    type="button"
                    className={cn(
                      "h-[34px] w-full px-3 text-xs border border-dashed border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center",
                      !description && "text-muted-foreground"
                    )}
                    onClick={() => setDescription(description ? "" : " ")}
                  >
                    {description ? <>Note <Check className="size-3 ml-1" /></> : "Note"}
                  </button>
                </div>

                {/* Description - only show when user clicked "+ Note" */}
                {description && (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a note..."
                    className="min-h-[60px] text-sm resize-none"
                    autoFocus
                  />
                )}
              </div>

              {/* Actions - Link Mode */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isCreatingLink}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLink}
                  disabled={!linkName.trim() || !linkUrl.trim() || isCreatingLink}
                >
                  {isCreatingLink ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Link2 className="size-4" />
                      Add Link
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
