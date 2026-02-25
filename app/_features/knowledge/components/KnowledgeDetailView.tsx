"use client";

import { useState, useCallback, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import { Badge } from "@/app/_components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  StickyNote,
  Link as LinkIcon,
  ExternalLink,
  Pencil,
  Check,
  ChevronDown,
  Trash2,
  Copy,
  Sparkles,
  Pin,
  Loader2,
} from "lucide-react";
import type { KnowledgeType } from "../types";

interface KnowledgeDetailItem {
  id: string;
  type: KnowledgeType;
  title: string;
  content: string | null;
  source_url: string | null;
  file_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  tags: string[];
  is_pinned: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project?: { id: string; name: string } | null;
}

interface KnowledgeDetailViewProps {
  item: KnowledgeDetailItem;
  onBack: () => void;
  onDownload?: (item: KnowledgeDetailItem) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  onCreateFrom?: (item: KnowledgeDetailItem, type: string) => void;
  parentLabel?: string;
}

// Type display config
const TYPE_CONFIG: Record<KnowledgeType, { label: string; icon: React.ReactNode; color: string }> = {
  document: { label: "Document", icon: <FileText className="h-4 w-4" />, color: "text-blue-400" },
  discovery_note: { label: "Note", icon: <StickyNote className="h-4 w-4" />, color: "text-amber-400" },
  meeting_transcript: { label: "Transcript", icon: <FileText className="h-4 w-4" />, color: "text-purple-400" },
  intake_response: { label: "Intake", icon: <FileText className="h-4 w-4" />, color: "text-emerald-400" },
  link: { label: "Link", icon: <LinkIcon className="h-4 w-4" />, color: "text-sky-400" },
  insight: { label: "Insight", icon: <StickyNote className="h-4 w-4" />, color: "text-amber-400" },
  decision: { label: "Decision", icon: <FileText className="h-4 w-4" />, color: "text-orange-400" },
  feedback: { label: "Feedback", icon: <StickyNote className="h-4 w-4" />, color: "text-pink-400" },
  asset: { label: "Asset", icon: <ImageIcon className="h-4 w-4" />, color: "text-indigo-400" },
};

// Check if file is previewable
function isPreviewableImage(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

function isPreviewablePdf(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return mimeType === "application/pdf";
}

function isPreviewableText(mimeType?: string | null, fileName?: string | null): boolean {
  // Check mime type
  if (mimeType?.startsWith("text/")) return true;
  if (mimeType === "application/json") return true;

  // Check file extension as fallback
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["md", "txt", "json", "csv", "xml", "yaml", "yml", "html", "css", "js", "ts", "tsx", "jsx"].includes(ext || "");
  }
  return false;
}

function isTextContent(type: KnowledgeType): boolean {
  return ["discovery_note", "insight", "decision", "feedback", "intake_response", "meeting_transcript"].includes(type);
}

export function KnowledgeDetailView({
  item,
  onBack,
  onDownload,
  onDelete,
  onUpdate,
  onCreateFrom,
  parentLabel = "Knowledge",
}: KnowledgeDetailViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // State for text file content (may be pre-fetched server-side or fetched client-side)
  const [textFileContent, setTextFileContent] = useState<string | null>(null);
  const [isLoadingTextFile, setIsLoadingTextFile] = useState(false);

  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.document;
  const canPreviewText = isPreviewableText(item.mime_type, item.file_name);

  // Use pre-fetched content if available (passed via item.content for text files)
  // This avoids CORS issues with client-side fetch from Supabase signed URLs
  useEffect(() => {
    // If item.content has the file content (pre-fetched server-side), use it
    if (canPreviewText && item.content && !textFileContent) {
      console.log("[KnowledgeDetailView] Using pre-fetched text content");
      setTextFileContent(item.content);
    }
    // Fallback: try client-side fetch if we have a URL but no content
    else if (canPreviewText && item.file_url && !textFileContent && !item.content) {
      console.log("[KnowledgeDetailView] Attempting client-side fetch (may fail due to CORS)");
      setIsLoadingTextFile(true);
      fetch(item.file_url)
        .then((res) => res.text())
        .then((text) => {
          setTextFileContent(text);
          setIsLoadingTextFile(false);
        })
        .catch((err) => {
          console.error("[KnowledgeDetailView] Client-side fetch failed:", err);
          setIsLoadingTextFile(false);
        });
    }
  }, [canPreviewText, item.file_url, item.content, textFileContent]);

  // Handle title edit
  const startEditingTitle = useCallback(() => {
    setEditedTitle(item.title);
    setIsEditingTitle(true);
  }, [item]);

  const saveTitle = useCallback(async () => {
    if (!onUpdate || editedTitle === item.title) {
      setIsEditingTitle(false);
      return;
    }
    setIsSaving(true);
    await onUpdate(item.id, { title: editedTitle });
    setIsSaving(false);
    setIsEditingTitle(false);
  }, [item, onUpdate, editedTitle]);

  // Handle description edit
  const startEditingDescription = useCallback(() => {
    setEditedDescription(item.content || "");
    setIsEditingDescription(true);
  }, [item]);

  const saveDescription = useCallback(async () => {
    if (!onUpdate) {
      setIsEditingDescription(false);
      return;
    }
    setIsSaving(true);
    await onUpdate(item.id, { content: editedDescription });
    setIsSaving(false);
    setIsEditingDescription(false);
  }, [item, onUpdate, editedDescription]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);

    if (item.file_url) {
      try {
        const response = await fetch(item.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.file_name || item.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Download failed:", error);
      }
    } else if (item.source_url && item.type === "link") {
      window.open(item.source_url, "_blank");
    } else if (item.content) {
      const blob = new Blob([item.content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.title}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    setIsDownloading(false);
    onDownload?.(item);
  }, [item, onDownload]);

  // Copy link
  const handleCopyLink = useCallback(() => {
    if (item.source_url) {
      navigator.clipboard.writeText(item.source_url);
    }
  }, [item]);

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {parentLabel}
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {item.title}
        </span>
      </nav>

      {/* Header with actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          {isEditingTitle ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="h-9 text-lg font-semibold"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              />
              <Button size="icon" variant="ghost" onClick={saveTitle} disabled={isSaving} className="h-9 w-9">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-lg font-semibold truncate">{item.title}</h2>
              {item.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-400" />}
              {onUpdate && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={startEditingTitle}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Type badge and date */}
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex items-center gap-1 ${typeConfig.color}`}>
              {typeConfig.icon}
              <span className="text-xs font-medium">{typeConfig.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onCreateFrom && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Create from this
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onCreateFrom(item, "strategy")}>
                  Strategy Doc
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFrom(item, "proposal")}>
                  Proposal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFrom(item, "brief")}>
                  Project Brief
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFrom(item, "agenda")}>
                  Meeting Agenda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-1.5"
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {item.type === "link" ? "Open" : "Download"}
          </Button>

          {item.source_url && (
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </Button>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview pane */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-muted/20 min-h-[400px] flex items-center justify-center p-4">
            {/* Image Preview */}
            {isPreviewableImage(item.mime_type) && item.file_url && (
              <img
                src={item.file_url}
                alt={item.title}
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            )}

            {/* PDF Preview */}
            {isPreviewablePdf(item.mime_type) && item.file_url && (
              <iframe
                src={`${item.file_url}#view=FitH`}
                className="w-full h-[500px] rounded-lg border border-border"
                title={item.title}
              />
            )}

            {/* Text/Note Preview (from content field) */}
            {/* Show for notes/transcripts OR for documents with content but no file */}
            {((isTextContent(item.type) && item.content) ||
              (item.type === "document" && item.content && !item.file_url && !canPreviewText)) && (
              <div className="w-full bg-card rounded-lg border border-border p-6 overflow-auto max-h-[500px]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
                    {item.content}
                  </pre>
                </div>
              </div>
            )}

            {/* Text File Preview (from server-fetched or client-fetched content) */}
            {canPreviewText && (item.file_url || textFileContent) && (
              <div className="w-full bg-card rounded-lg border border-border p-6 overflow-auto max-h-[500px]">
                {isLoadingTextFile ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading file content...</span>
                  </div>
                ) : textFileContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                      {textFileContent}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Could not load file content
                  </p>
                )}
              </div>
            )}

            {/* Text File - URL not yet loaded */}
            {canPreviewText && !item.file_url && (
              <div className="w-full max-w-md bg-card rounded-lg border border-border p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <p className="text-sm font-medium mb-1">{item.file_name || item.title}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Unable to load preview. The file URL could not be generated.
                </p>
                <p className="text-xs text-muted-foreground">
                  Try refreshing the page or contact support if this persists.
                </p>
              </div>
            )}

            {/* Link Preview */}
            {item.type === "link" && item.source_url && (
              <div className="w-full max-w-md bg-card rounded-lg border border-border p-6 text-center">
                <LinkIcon className="h-12 w-12 mx-auto text-sky-400 mb-4" />
                <p className="text-sm text-muted-foreground mb-4 break-all">
                  {item.source_url}
                </p>
                <Button onClick={() => window.open(item.source_url!, "_blank")} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Link
                </Button>
              </div>
            )}

            {/* Fallback for non-previewable files */}
            {item.type === "document" && !isPreviewableImage(item.mime_type) && !isPreviewablePdf(item.mime_type) && !canPreviewText && (
              <div className="w-full max-w-md bg-card rounded-lg border border-border p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <p className="text-sm font-medium mb-1">{item.file_name || item.title}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  This file type cannot be previewed
                </p>
                <Button onClick={handleDownload} disabled={isDownloading || !item.file_url} className="gap-2">
                  {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download to View
                </Button>
              </div>
            )}

            {/* Missing file URL - waiting for signed URL */}
            {item.type === "document" && !item.file_url && !isTextContent(item.type) && (
              <div className="w-full max-w-md bg-card rounded-lg border border-border p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <p className="text-sm font-medium mb-1">{item.file_name || item.title}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Unable to load file preview. The download URL could not be generated.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          {/* Description */}
          <div className="rounded-lg border border-border p-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Description
            </label>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="text-sm min-h-[100px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveDescription} disabled={isSaving}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group">
                <p className="text-sm text-muted-foreground">
                  {item.content?.substring(0, 200) || "No description"}
                  {item.content && item.content.length > 200 && "..."}
                </p>
                {onUpdate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={startEditingDescription}
                    className="mt-2 h-7 text-xs opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-border p-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.length > 0 ? (
                item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No tags</span>
              )}
            </div>
          </div>

          {/* Project */}
          {item.project && (
            <div className="rounded-lg border border-border p-4">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Project
              </label>
              <Badge variant="outline" className="text-xs">
                {item.project.name}
              </Badge>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Added</label>
              <p className="text-sm">
                {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Last updated</label>
              <p className="text-sm">
                {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
