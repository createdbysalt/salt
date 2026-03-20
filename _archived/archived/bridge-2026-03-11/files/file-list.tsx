"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { toast } from "sonner";
import { Download, Trash2, File as FileIcon, Loader2 } from "lucide-react";
import { getDownloadUrl, deleteFile } from "./actions";
import { formatDistanceToNow } from "date-fns";

interface ProjectFile {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  category: string;
  created_at: string;
  uploaded_by_user?: { email: string };
}

interface FileListProps {
  files: ProjectFile[];
  canDelete?: boolean;
}

const categoryLabels: Record<string, string> = {
  brand_asset: "Brand Asset",
  deliverable: "Deliverable",
  contract: "Contract",
  screenshot: "Screenshot",
  other: "Other",
};

export function FileList({ files, canDelete = false }: FileListProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloading(fileId);
    try {
      const result = await getDownloadUrl(fileId);
      if (result.success && result.data) {
        // Create temporary link and trigger download
        const link = document.createElement("a");
        link.href = result.data.downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started");
      } else {
        toast.error(result.error || "Failed to download file");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }

    setDeleting(fileId);
    try {
      const result = await deleteFile(fileId);
      if (result.success) {
        toast.success("File deleted");
        window.location.reload(); // Refresh the page
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.file_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[file.category] || file.category}
                </Badge>
                <span>{(file.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(file.created_at), {
                    addSuffix: true,
                  })}
                </span>
                {file.uploaded_by_user && (
                  <>
                    <span>•</span>
                    <span>{file.uploaded_by_user.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(file.id, file.file_name)}
              disabled={downloading === file.id}
            >
              {downloading === file.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(file.id)}
                disabled={deleting === file.id}
              >
                {deleting === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


