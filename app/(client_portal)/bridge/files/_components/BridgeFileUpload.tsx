"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Progress,
  Textarea,
} from "@repo/ui";
import { cn } from "@repo/utils";

import { uploadBridgeFile } from "../actions";

// ============================================================================
// Types
// ============================================================================

interface BridgeFileUploadProps {
  open: boolean;
  onOpenChange: (_isOpen: boolean) => void;
}

interface SelectedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  previewUrl?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".md",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".zip", ".rar",
];

// ============================================================================
// Helpers
// ============================================================================

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (["pdf", "doc", "docx", "txt", "md"].includes(ext || "")) {
    return <FileText className="size-5 text-muted-foreground" />;
  }
  if (["xlsx", "xls", "csv"].includes(ext || "")) {
    return <FileSpreadsheet className="size-5 text-muted-foreground" />;
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) {
    return <FileImage className="size-5 text-muted-foreground" />;
  }
  return <File className="size-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds 50MB limit" };
  }

  // Check extension
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "File type not supported" };
  }

  return { valid: true };
}

// ============================================================================
// Main Component
// ============================================================================

export function BridgeFileUpload({ open, onOpenChange }: BridgeFileUploadProps) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFiles((prev) => {
        prev.forEach((f) => {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        return [];
      });
      setDragActive(false);
      setIsUploading(false);
      setDescription("");
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

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status === "pending");
    if (validFiles.length === 0) return;

    setIsUploading(true);

    for (const fileItem of validFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: "uploading" as const, progress: 10 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", fileItem.file);

        const result = await uploadBridgeFile(formData, description.trim() || undefined);

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, status: "success" as const, progress: 100 } : f
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
            f.id === fileItem.id ? { ...f, status: "error" as const, error: "Upload failed" } : f
          )
        );
      }
    }

    setIsUploading(false);

    // Close dialog after short delay
    setTimeout(() => {
      onOpenChange(false);
    }, 800);
  };

  const validFilesCount = files.filter((f) => f.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Share files with your team. Max file size: 50MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 transition-colors",
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
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, Excel, images, and more
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    item.status === "error"
                      ? "border-destructive/50 bg-destructive/5"
                      : item.status === "success"
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  {item.previewUrl ? (
                    <div className="size-10 rounded overflow-hidden shrink-0 bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </span>
                      {item.status === "error" && (
                        <span className="text-xs text-destructive">{item.error}</span>
                      )}
                      {item.status === "uploading" && (
                        <Progress value={item.progress} className="h-1 w-16" />
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
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  )}
                  {item.status === "error" && (
                    <AlertCircle className="size-4 shrink-0 text-destructive" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Description (optional) */}
          {files.length > 0 && validFilesCount > 0 && (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note (optional)..."
              className="min-h-[60px] resize-none"
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={validFilesCount === 0 || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload {validFilesCount > 0 && `(${validFilesCount})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
