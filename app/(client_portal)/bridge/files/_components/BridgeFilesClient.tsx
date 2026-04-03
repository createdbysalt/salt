"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Upload,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Link2,
  ArrowUpDown,
  FolderOpen,
  Eye,
  Loader2,
} from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import type { BridgeFile } from "@/app/_lib/bridge/queries";
import { getBridgeFileDownloadUrl } from "../actions";
import { BridgeFileDetailPanel } from "./BridgeFileDetailPanel";
import { BridgeFileUpload } from "./BridgeFileUpload";

// ============================================================================
// Types
// ============================================================================

interface BridgeFilesClientProps {
  files: BridgeFile[];
  projects: Array<{ id: string; name: string }>;
  currentUserId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getFileIcon(mimeType: string | null, fileType: "file" | "link" = "file") {
  if (fileType === "link") {
    return <Link2 className="size-5 text-primary" />;
  }

  if (!mimeType) return <File className="size-5 text-muted-foreground" />;

  if (mimeType.startsWith("image/")) {
    return <FileImage className="size-5 text-muted-foreground" />;
  }
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType === "text/plain") {
    return <FileText className="size-5 text-muted-foreground" />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return <FileSpreadsheet className="size-5 text-muted-foreground" />;
  }
  return <File className="size-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDirectionLabel(direction: "from_client" | "to_client" | "internal"): string {
  switch (direction) {
    case "from_client":
      return "You uploaded";
    case "to_client":
      return "Shared with you";
    case "internal":
      return "Shared with you";
    default:
      return "";
  }
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FolderOpen className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No files yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Files shared with you by your team will appear here. You can also upload files to share.
      </p>
      <Button className="mt-6" onClick={onUpload}>
        <Upload className="size-4" />
        Upload File
      </Button>
    </div>
  );
}

// ============================================================================
// File Card
// ============================================================================

interface FileCardProps {
  file: BridgeFile;
  onClick: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}

function FileCard({ file, onClick, onDownload, isDownloading }: FileCardProps) {
  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Icon */}
      <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {getFileIcon(file.mimeType, file.fileType)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{file.fileName}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          {file.projectName && (
            <>
              <span className="truncate max-w-[120px]">{file.projectName}</span>
              <span>·</span>
            </>
          )}
          {file.sizeBytes && (
            <>
              <span>{formatFileSize(file.sizeBytes)}</span>
              <span>·</span>
            </>
          )}
          <span>{format(new Date(file.createdAt), "MMM d, yyyy")}</span>
        </div>
        {file.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {file.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs font-normal">
                {tag.label}
              </Badge>
            ))}
            {file.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{file.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Direction indicator */}
      <div className="hidden sm:block text-xs text-muted-foreground text-right shrink-0">
        {getDirectionLabel(file.direction)}
      </div>

      {/* Download button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : file.fileType === "link" ? (
          <Eye className="size-4" />
        ) : (
          <Download className="size-4" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BridgeFilesClient({
  files,
  projects,
  currentUserId,
}: BridgeFilesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [selectedFile, setSelectedFile] = useState<BridgeFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = files;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.fileName.toLowerCase().includes(query) ||
          f.projectName?.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query) ||
          f.tags.some((t) => t.label.toLowerCase().includes(query))
      );
    }

    // Project filter
    if (projectFilter !== "all") {
      result = result.filter((f) => f.projectId === projectFilter);
    }

    // Sort
    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.fileName.localeCompare(b.fileName));
    } else {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }, [files, searchQuery, projectFilter, sortBy]);

  // Handle download
  const handleDownload = async (file: BridgeFile) => {
    setDownloadingId(file.id);
    try {
      const result = await getBridgeFileDownloadUrl(file.id);
      if (result.success && result.url) {
        if (file.fileType === "link") {
          window.open(result.url, "_blank", "noopener,noreferrer");
        } else {
          const link = document.createElement("a");
          link.href = result.url;
          link.download = file.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Files</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {files.length} {files.length === 1 ? "file" : "files"} shared with you
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload
        </Button>
      </div>

      {/* Filters */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Project filter */}
          {projects.length > 1 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent data-surface="bridge">
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "name")}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent data-surface="bridge">
              <SelectItem value="date">Newest first</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      {files.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState onUpload={() => setUploadOpen(true)} />
          </CardContent>
        </Card>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No files match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => setSelectedFile(file)}
              onDownload={() => handleDownload(file)}
              isDownloading={downloadingId === file.id}
            />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      <BridgeFileDetailPanel
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onDownload={handleDownload}
        currentUserId={currentUserId}
      />

      {/* Upload Dialog */}
      <BridgeFileUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
}
