"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Dialog,
  DialogContent,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Textarea } from "@/app/_components/ui/textarea";
import { Badge } from "@/app/_components/ui/badge";
import { Spinner } from "@/app/_components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  ArrowLeft,
  Download,
  X,
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
} from "lucide-react";
import type { KnowledgeType } from "../types";

interface KnowledgePreviewItem {
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

interface KnowledgePreviewModalProps {
  item: KnowledgePreviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: KnowledgePreviewItem) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<KnowledgePreviewItem>) => Promise<void>;
  onCreateFrom?: (item: KnowledgePreviewItem, type: string) => void;
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

function isTextContent(type: KnowledgeType): boolean {
  return ["discovery_note", "insight", "decision", "feedback", "intake_response", "meeting_transcript"].includes(type);
}

export function KnowledgePreviewModal({
  item,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onUpdate,
  onCreateFrom,
}: KnowledgePreviewModalProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const typeConfig = item ? TYPE_CONFIG[item.type] || TYPE_CONFIG.document : TYPE_CONFIG.document;

  // Handle title edit
  const startEditingTitle = useCallback(() => {
    if (item) {
      setEditedTitle(item.title);
      setIsEditingTitle(true);
    }
  }, [item]);

  const saveTitle = useCallback(async () => {
    if (!item || !onUpdate || editedTitle === item.title) {
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
    if (item) {
      setEditedDescription(item.content || "");
      setIsEditingDescription(true);
    }
  }, [item]);

  const saveDescription = useCallback(async () => {
    if (!item || !onUpdate) {
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
    if (!item) return;

    setIsDownloading(true);

    if (item.file_url) {
      // For files with URLs, trigger download
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
      // For links, open in new tab
      window.open(item.source_url, "_blank");
    } else if (item.content) {
      // For text content, download as .txt
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
    if (item?.source_url) {
      navigator.clipboard.writeText(item.source_url);
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className={`flex items-center gap-1.5 ${typeConfig.color}`}>
              {typeConfig.icon}
              <span className="text-xs font-medium">{typeConfig.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-8 gap-1.5"
            >
              {isDownloading ? (
                <Spinner size="sm" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {item.type === "link" ? "Open" : "Download"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview Pane */}
          <div className="flex-1 bg-muted/30 flex items-center justify-center overflow-auto p-4">
            {/* Image Preview */}
            {isPreviewableImage(item.mime_type) && item.file_url && (
              <img
                src={item.file_url}
                alt={item.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            )}

            {/* PDF Preview */}
            {isPreviewablePdf(item.mime_type) && item.file_url && (
              <iframe
                src={`${item.file_url}#view=FitH`}
                className="w-full h-full rounded-lg border border-border"
                title={item.title}
              />
            )}

            {/* Text/Note Preview */}
            {isTextContent(item.type) && item.content && (
              <div className="w-full max-w-2xl bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
                    {item.content}
                  </pre>
                </div>
              </div>
            )}

            {/* Link Preview */}
            {item.type === "link" && item.source_url && (
              <div className="w-full max-w-md bg-card rounded-lg border border-border p-6 shadow-sm text-center">
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
            {item.type === "document" && !isPreviewableImage(item.mime_type) && !isPreviewablePdf(item.mime_type) && (
              <div className="w-full max-w-md bg-card rounded-lg border border-border p-6 shadow-sm text-center">
                <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <p className="text-sm font-medium mb-1">{item.file_name || item.title}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  This file type cannot be previewed
                </p>
                <Button onClick={handleDownload} disabled={isDownloading} className="gap-2">
                  {isDownloading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                  Download to View
                </Button>
              </div>
            )}
          </div>

          {/* Metadata Sidebar */}
          <div className="w-72 border-l border-border p-4 overflow-y-auto space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              {isEditingTitle ? (
                <div className="flex gap-1">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  />
                  <Button size="icon" variant="ghost" onClick={saveTitle} disabled={isSaving} className="h-8 w-8">
                    {isSaving ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <p className="text-sm font-medium">{item.title}</p>
                  {onUpdate && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={startEditingTitle}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              {isEditingDescription ? (
                <div className="space-y-1">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="text-sm min-h-[80px]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveDescription} disabled={isSaving}>
                      {isSaving ? <Spinner size="sm" /> : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <p className="text-sm text-muted-foreground">
                    {item.content?.substring(0, 150) || "No description"}
                    {item.content && item.content.length > 150 && "..."}
                  </p>
                  {onUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startEditingDescription}
                      className="mt-1 h-6 text-xs opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-1">
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
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Project</label>
                <Badge variant="outline" className="text-xs">
                  {item.project.name}
                </Badge>
              </div>
            )}

            {/* Dates */}
            <div className="pt-2 border-t border-border space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Added</label>
                <p className="text-xs">
                  {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Last updated</label>
                <p className="text-xs">
                  {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-border space-y-2">
              {/* Create From Menu */}
              {onCreateFrom && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Create from this...
                      </span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
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

              {/* Other Actions */}
              <div className="flex gap-2">
                {item.source_url && (
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-1 gap-1.5">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
