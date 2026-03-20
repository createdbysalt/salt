"use client";

import { useState } from "react";
import {
  FileText,
  Link as LinkIcon,
  StickyNote,
  FileQuestion,
  MessageSquare,
  Pin,
  PinOff,
  Trash2,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { Badge } from "@/app/_components/ui/badge";
import {
  deleteKnowledgeItem,
  toggleKnowledgeItemPin,
  type KnowledgeItem,
} from "./knowledge-actions";

interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  onSuccess: (_message: string) => void;
  onError: (_message: string) => void;
}

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  transcript: <MessageSquare className="h-4 w-4" />,
  intake_response: <FileQuestion className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  document: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  transcript: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  intake_response: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  note: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  link: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function KnowledgeItemCard({
  item,
  onSuccess,
  onError,
}: KnowledgeItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingPin, setIsTogglingPin] = useState(false);

  const handleTogglePin = async () => {
    setIsTogglingPin(true);
    const result = await toggleKnowledgeItemPin(item.id);
    setIsTogglingPin(false);

    if (result.success) {
      onSuccess(item.isPinned ? "Unpinned item" : "Pinned item");
    } else {
      onError(result.error || "Failed to toggle pin");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteKnowledgeItem(item.id);
    setIsDeleting(false);

    if (result.success) {
      onSuccess("Item deleted");
    } else {
      onError(result.error || "Failed to delete item");
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow ${
        item.isPinned ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon and Content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`p-2 rounded-lg shrink-0 ${CONTENT_TYPE_COLORS[item.contentType]}`}
          >
            {CONTENT_TYPE_ICONS[item.contentType]}
          </div>

          <div className="min-w-0 flex-1">
            {/* Title */}
            <div className="flex items-center gap-2">
              {item.isPinned && (
                <Pin className="h-3 w-3 text-primary shrink-0" />
              )}
              <h4 className="font-medium text-sm truncate">{item.title}</h4>
            </div>

            {/* Content Preview */}
            {item.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.content}
              </p>
            )}

            {/* External Link */}
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="truncate">{item.externalUrl}</span>
              </a>
            )}

            {/* File Info */}
            {item.fileName && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.fileName}
                {item.fileSizeBytes && (
                  <span className="ml-2">
                    ({formatFileSize(item.fileSizeBytes)})
                  </span>
                )}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
              </span>
              {item.tags.length > 0 && (
                <div className="flex gap-1">
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTogglePin} disabled={isTogglingPin}>
              {item.isPinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
            {item.externalUrl && (
              <DropdownMenuItem asChild>
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
