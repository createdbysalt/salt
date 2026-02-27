"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  Search,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Input,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { getClientFiles, type ClientFile } from "@/app/actions/files/get-client-files";
import { getFileDownloadUrl } from "@/app/actions/files/update-client-file";

// =============================================================================
// Types
// =============================================================================

interface ClientFilePickerProps {
  clientId: string;
  /** Called when a file is selected. `existingFileId` is the file's ID in the Files tab (to avoid duplication). */
  onFileSelect: (file: File, existingFileId: string) => void;
  disabled?: boolean;
  maxAttachments?: number;
  currentAttachmentCount?: number;
  children: React.ReactNode;
}

// =============================================================================
// Helpers
// =============================================================================

function getFileIconElement(mimeType: string | null) {
  if (!mimeType) return <FileIcon className="size-4 text-muted-foreground" />;

  if (mimeType.startsWith("image/")) {
    return <FileImage className="size-4 text-blue-500" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="size-4 text-red-500" />;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return <FileSpreadsheet className="size-4 text-green-500" />;
  }
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown"
  ) {
    return <FileText className="size-4 text-blue-500" />;
  }
  return <FileIcon className="size-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// Main Component
// =============================================================================

export function ClientFilePicker({
  clientId,
  onFileSelect,
  disabled = false,
  maxAttachments = 5,
  currentAttachmentCount = 0,
  children,
}: ClientFilePickerProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  // Fetch files when popover opens
  useEffect(() => {
    if (open && files.length === 0) {
      setIsLoading(true);
      getClientFiles(clientId)
        .then((data) => {
          // Filter out links - only show actual files
          setFiles(data.files.filter((f) => f.fileType !== "link"));
        })
        .catch((err) => {
          console.error("Failed to fetch files:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, clientId, files.length]);

  // Filter files by search query
  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle file selection
  const handleSelectFile = useCallback(
    async (clientFile: ClientFile) => {
      if (currentAttachmentCount >= maxAttachments) {
        return;
      }

      setLoadingFileId(clientFile.id);

      try {
        // Get signed download URL
        const result = await getFileDownloadUrl(clientFile.id);
        if (!result.success || !result.url) {
          throw new Error("Failed to get download URL");
        }

        // Fetch the file content
        const response = await fetch(result.url);
        if (!response.ok) {
          throw new Error("Failed to download file");
        }

        const blob = await response.blob();

        // Create a File object
        const file = new File([blob], clientFile.fileName, {
          type: clientFile.mimeType || "application/octet-stream",
        });

        // Pass the file's existing ID so it won't be duplicated in the Files tab
        onFileSelect(file, clientFile.id);
        setOpen(false);
      } catch (error) {
        console.error("Failed to select file:", error);
      } finally {
        setLoadingFileId(null);
      }
    },
    [onFileSelect, currentAttachmentCount, maxAttachments]
  );

  const canAddMore = currentAttachmentCount < maxAttachments;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled || !canAddMore}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">Attach from Files</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <FolderOpen className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {files.length === 0
                  ? "No files uploaded yet"
                  : "No files match your search"}
              </p>
            </div>
          ) : (
            <div className="p-1">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  disabled={loadingFileId !== null}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                    "hover:bg-muted transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loadingFileId === file.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    getFileIconElement(file.mimeType)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.sizeBytes)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!canAddMore && (
          <div className="p-2 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Maximum {maxAttachments} attachments reached
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
