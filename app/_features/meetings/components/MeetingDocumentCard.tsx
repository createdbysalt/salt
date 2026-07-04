"use client";

import {
  FileText,
  ScrollText,
  Mic,
  Eye,
  Download,
  Link2,
  ExternalLink,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";

export type MeetingDocumentType = "prep" | "summary" | "transcript";

export type MeetingDocumentStatus =
  | "empty"
  | "generating"
  | "ready"
  | "connected";

type DocumentInfo = {
  id?: string;
  provider?: string;
  url?: string;
  previewStats?: string[];
};

type MeetingDocumentCardProps = {
  type: MeetingDocumentType;
  status: MeetingDocumentStatus;
  document?: DocumentInfo;
  isPastMeeting: boolean;
  onView?: () => void;
  onConnect?: () => void;
  onDownload?: (format: "pdf" | "docx") => void;
  onOpenExternal?: () => void;
};

const DOCUMENT_CONFIG: Record<
  MeetingDocumentType,
  {
    title: string;
    icon: typeof FileText;
    emptyMessage: string;
    emptySubMessage: string;
  }
> = {
  prep: {
    title: "Prep Notes",
    icon: FileText,
    emptyMessage: "Salt will prepare this",
    emptySubMessage: "before your meeting",
  },
  summary: {
    title: "Summary",
    icon: ScrollText,
    emptyMessage: "Salt will prepare this",
    emptySubMessage: "after your meeting",
  },
  transcript: {
    title: "Transcript",
    icon: Mic,
    emptyMessage: "No transcript",
    emptySubMessage: "Connect a recording service",
  },
};

export function MeetingDocumentCard({
  type,
  status,
  document,
  isPastMeeting: _isPastMeeting,
  onView,
  onConnect,
  onDownload,
  onOpenExternal,
}: MeetingDocumentCardProps) {
  const config = DOCUMENT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card/60 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{config.title}</h3>
            {status === "ready" && (
              <span className="flex items-center gap-1 text-xs text-success">
                <span className="size-1.5 rounded-full bg-success" />
                Ready
              </span>
            )}
            {status === "connected" && document?.provider && (
              <span className="text-xs text-muted-foreground">{document.provider}</span>
            )}
            {status === "generating" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Generating...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="mb-4 min-h-[60px] flex-1">
        {(status === "empty" || status === "generating") && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">{config.emptyMessage}</p>
            <p className="text-xs text-muted-foreground/70">{config.emptySubMessage}</p>
          </div>
        )}

        {(status === "ready" || status === "connected") && document?.previewStats && (
          <div className="space-y-1.5">
            {document.previewStats.map((stat, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {stat}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {status === "empty" && (
          <button
            type="button"
            onClick={onConnect}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/50"
          >
            <Link2 className="size-4" strokeWidth={2} />
            Connect
          </button>
        )}

        {status === "generating" && (
          <div className="flex flex-1 items-center justify-center rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Preparing...
          </div>
        )}

        {status === "ready" && (
          <>
            <button
              type="button"
              onClick={onView}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              <Eye className="size-4" strokeWidth={2} />
              View
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/50"
                >
                  <Download className="size-4" strokeWidth={2} />
                  <ChevronDown className="size-3" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => onDownload?.("pdf")}>
                  <FileText className="mr-2 size-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload?.("docx")}>
                  <FileText className="mr-2 size-4" />
                  Word (.docx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {status === "connected" && (
          <>
            <button
              type="button"
              onClick={onOpenExternal}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              <ExternalLink className="size-4" strokeWidth={2} />
              Open
            </button>
            <button
              type="button"
              onClick={onConnect}
              className="flex items-center justify-center rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            >
              <Link2 className="size-4" strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
