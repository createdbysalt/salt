"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MoreHorizontal,
  Printer,
  Send,
  Share2,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@repo/patterns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import {
  deleteFile,
  getFileDownloadUrl,
  getFilePreviewUrl,
} from "@/app/_features/people/actions/files/update-client-file";
import { archiveMemoryFile, fetchFileDetailData, logFileViewActivity, updateMemoryFileField } from "../actions/file-actions";
import {
  ASSET_KIND_LABEL,
  FILE_CATEGORY_LABEL,
  relativeDays,
  type MemoryFile,
} from "../data";
import { SourceChip } from "@/app/_features/memory/components/SourceChip";
import { askSaltContextForFile, openAskSalt } from "../utils/open-ask-salt";
import { fileLinkOpenLabel, resolveFileRecordUrl } from "../utils/link-display";
import { FileAssetPreviewPanel } from "./FileAssetPreviewPanel";
import { FileOverviewTab } from "./FileOverviewTab";
import { FileActivityTab } from "./FileActivityTab";
import { mapFileToDetailViewModel, generateFileCTAs } from "../utils/detail-mapper";
import type { FileDetailRecord, FileActivityEvent } from "../detail-types";
import { UnifiedConnectionsTab } from "@/app/_features/connections/components/UnifiedConnectionsTab";
import type { ConnectionNode } from "@/app/_features/connections/types";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import { buildFileConnectionNodes } from "../utils/connections";

type FilesPreviewModalProps = {
  file: MemoryFile | null;
  /** Optional detailed file data for Overview/Activity tabs */
  fileDetail?: FileDetailRecord | null;
  /** Optional activities for Activity tab */
  activities?: FileActivityEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ModalTab = "overview" | "connections" | "activity";

function isPreviewableImage(mimeType: string | null | undefined): boolean {
  return Boolean(mimeType?.startsWith("image/"));
}

function isPreviewablePdf(mimeType: string | null | undefined): boolean {
  return mimeType === "application/pdf";
}

function assetPreviewIcon(file: MemoryFile) {
  if (file.kind === "link") return Link2;
  return FileText;
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center px-3 py-2.5 text-xs font-medium transition",
        active
          ? "border-b-2 border-foreground text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function OverviewFallback({ file }: { file: MemoryFile }) {
  return (
    <div className="space-y-6">
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h4>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-foreground">{ASSET_KIND_LABEL[file.kind]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="tabular-nums text-foreground">{relativeDays(file.updatedAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Source</dt>
            <dd>
              <SourceChip source={file.source} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Category</dt>
            <dd className="text-foreground">{FILE_CATEGORY_LABEL[file.category]}</dd>
          </div>
        </dl>
      </section>

      {file.tags.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </h4>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {file.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {file.aiSummary ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Summary
          </h4>
          <p className="mt-2 text-sm text-foreground/80">{file.aiSummary}</p>
        </section>
      ) : null}
    </div>
  );
}

export function FilesPreviewModal({
  file,
  fileDetail: propFileDetail,
  activities: propActivities = [],
  open,
  onOpenChange,
}: FilesPreviewModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<ModalTab>("overview");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Local state for fetched detail data
  const [fetchedDetail, setFetchedDetail] = React.useState<FileDetailRecord | null>(null);
  const [fetchedActivities, setFetchedActivities] = React.useState<FileActivityEvent[]>([]);
  const [fetchedSupplementalActivity, setFetchedSupplementalActivity] = React.useState<
    ProfileActivityTimelineEntry[]
  >([]);
  const [fetchedSourceHistory, setFetchedSourceHistory] = React.useState<SourceHistoryEntry[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);
  const [connections, setConnections] = React.useState<ConnectionNode[]>([]);
  const loggedViewForFileRef = React.useRef<string | null>(null);

  // Use prop data if provided, otherwise use fetched data
  const fileDetail = propFileDetail ?? fetchedDetail;
  const activities = propActivities.length > 0 ? propActivities : fetchedActivities;
  const supplementalActivity = fetchedSupplementalActivity;
  const sourceHistory = fetchedSourceHistory;

  const refreshFileDetail = React.useCallback(async (fileId: string) => {
    const result = await fetchFileDetailData(fileId);
    if (result.ok && result.data) {
      setFetchedDetail(result.data.detail);
      setFetchedActivities(result.data.activities);
      setFetchedSupplementalActivity(result.data.supplementalActivity);
      setFetchedSourceHistory(result.data.sourceHistory);
    }
    return result;
  }, []);

  React.useEffect(() => {
    if (!file) {
      setConnections([]);
      return;
    }
    setConnections(buildFileConnectionNodes(file, fileDetail));
  }, [file, fileDetail]);

  React.useEffect(() => {
    if (!open || !file || activeTab !== "activity") return;
    if (loggedViewForFileRef.current === file.id) return;

    loggedViewForFileRef.current = file.id;
    void logFileViewActivity(file.id).then(() => {
      void refreshFileDetail(file.id);
    });
  }, [activeTab, file, open, refreshFileDetail]);

  // Reset tab and fetch detail when modal opens
  React.useEffect(() => {
    if (!open) {
      setActiveTab("overview");
      return;
    }

    // If we have prop data, don't fetch
    if (propFileDetail) return;

    // Fetch detail data when modal opens
    if (file && !fetchedDetail) {
      let mounted = true;
      setIsLoadingDetail(true);

      void fetchFileDetailData(file.id).then((result) => {
        if (!mounted) return;
        setIsLoadingDetail(false);

        if (result.ok && result.data) {
          setFetchedDetail(result.data.detail);
          setFetchedActivities(result.data.activities);
          setFetchedSupplementalActivity(result.data.supplementalActivity);
          setFetchedSourceHistory(result.data.sourceHistory);
        }
      });

      return () => {
        mounted = false;
      };
    }
  }, [open, file, propFileDetail, fetchedDetail]);

  // Clear fetched data when file changes
  React.useEffect(() => {
    setFetchedDetail(null);
    setFetchedActivities([]);
    setFetchedSupplementalActivity([]);
    setFetchedSourceHistory([]);
    loggedViewForFileRef.current = null;
  }, [file?.id]);

  React.useEffect(() => {
    if (!open || !file) {
      setPreviewUrl(null);
      return;
    }

    if (file.kind === "link" && file.url) {
      // Link URLs are user-provided — only preview validated http(s) URLs.
      setPreviewUrl(safeHttpUrl(file.url));
      return;
    }

    if (file.kind === "link") {
      setPreviewUrl(null);
      return;
    }

    let mounted = true;
    setIsLoadingPreview(true);
    void getFilePreviewUrl(file.id)
      .then((result) => {
        if (mounted && result.success && result.url) {
          setPreviewUrl(result.url);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingPreview(false);
      });

    return () => {
      mounted = false;
    };
  }, [file, open]);

  if (!file) return null;

  const overviewViewModel = fileDetail
    ? mapFileToDetailViewModel(fileDetail, activities, [], generateFileCTAs(fileDetail))
    : null;

  const openUrl = overviewViewModel?.url ?? file.url ?? previewUrl;
  const askLabel =
    file.kind === "link" ? "Ask Salt about this link" : "Ask Salt about this file";

  const refreshFile = () => {
    router.refresh();
  };

  const handleCopyLink = async () => {
    const link = openUrl ?? `${window.location.origin}/files?preview=${file.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleOpenExternal = () => {
    if (!openUrl) {
      toast("Preview unavailable");
      return;
    }
    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    const result = await getFileDownloadUrl(file.id);
    if (!result.success || !result.url) {
      toast.error(result.error ?? "Download unavailable");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    const result = await archiveMemoryFile(file.id);
    setIsArchiving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Archived");
    onOpenChange(false);
    refreshFile();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteFile(file.id);
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Could not delete file");
      return;
    }

    toast.success("Deleted");
    onOpenChange(false);
    refreshFile();
  };

  const handleAskSalt = () => {
    onOpenChange(false);
    openAskSalt({
      prompt: `Review "${file.name}" and tell me what matters.`,
      context: askSaltContextForFile(file),
    });
  };

  const handleUnlink = (node: ConnectionNode) => {
    setConnections((current) => current.filter((item) => item.id !== node.id));
    void refreshFileDetail(file.id).then(() => {
      refreshFile();
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex h-[min(85vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:!max-w-5xl [&>button]:hidden"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{file.name} preview</DialogTitle>
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="relative flex min-h-[280px] min-h-0 flex-1 flex-col overflow-hidden bg-muted/30 md:min-h-0">
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                {openUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full bg-background/80 backdrop-blur"
                    onClick={handleOpenExternal}
                    aria-label="Open in new tab"
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full bg-background/80 backdrop-blur"
                  onClick={() => void handleCopyLink()}
                  aria-label="Copy link"
                >
                  <Copy className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full bg-background/80 backdrop-blur"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {file.kind !== "link" ? (
                      <DropdownMenuItem onClick={() => void handleDownload()}>
                        <Download className="size-4" />
                        Download
                      </DropdownMenuItem>
                    ) : null}
                    {openUrl ? (
                      <DropdownMenuItem onClick={handleOpenExternal}>
                        <ExternalLink className="size-4" />
                        Open in new tab
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => void handleCopyLink()}>
                      <Copy className="size-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={isArchiving}
                      onClick={() => void handleArchive()}
                    >
                      <Archive className="size-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative min-h-0 flex-1">
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 sm:p-6">
                  {isLoadingPreview ? (
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  ) : isPreviewableImage(file.mimeType) && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : isPreviewablePdf(file.mimeType) && previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title={file.name}
                      className="h-full w-full rounded-xl border border-border/60 bg-background"
                    />
                  ) : (
                    <FileAssetPreviewPanel
                      icon={assetPreviewIcon(file)}
                      title={file.name}
                      openLabel={openUrl ? fileLinkOpenLabel(file) : undefined}
                      onOpen={openUrl ? handleOpenExternal : undefined}
                    />
                  )}
                </div>
              </div>

              {file.domain && openUrl ? (
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="absolute bottom-4 left-4 max-w-[min(100%-2rem,20rem)] truncate text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
                  title={openUrl}
                >
                  {file.domain}
                </button>
              ) : null}
            </div>

            <div className="flex w-full shrink-0 flex-col border-t border-border/60 md:w-[400px] md:border-l md:border-t-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {ASSET_KIND_LABEL[file.kind]}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-xl tracking-tight">{file.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-muted"
                  aria-label="Close preview"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-border/60">
                <TabButton
                  active={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                  label="Overview"
                />
                <TabButton
                  active={activeTab === "connections"}
                  onClick={() => setActiveTab("connections")}
                  label="Connections"
                />
                <TabButton
                  active={activeTab === "activity"}
                  onClick={() => setActiveTab("activity")}
                  label="Activity"
                />
              </div>

              {/* Tab Content */}
              <div
                data-file-preview-sidebar-scroll
                className="flex-1 overflow-y-auto"
              >
                {activeTab === "overview" ? (
                  <div className="p-5">
                    {isLoadingDetail ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : fileDetail ? (
                      <FileOverviewTab
                        file={overviewViewModel!}
                        onFieldUpdate={async (field, value) => {
                          const result = await updateMemoryFileField(fileDetail.id, field, value);
                          if (!result.ok) throw new Error(result.message);

                          const refreshed = await refreshFileDetail(fileDetail.id);
                          if (field === "url" && typeof value === "string" && value.trim()) {
                            setPreviewUrl(value.trim());
                          } else if (refreshed.ok && refreshed.data) {
                            const nextUrl = resolveFileRecordUrl(refreshed.data.detail);
                            if (nextUrl) setPreviewUrl(nextUrl);
                          }
                        }}
                      />
                    ) : (
                      <OverviewFallback file={file} />
                    )}
                  </div>
                ) : activeTab === "connections" ? (
                  <div className="p-5">
                    {isLoadingDetail && !fileDetail ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <UnifiedConnectionsTab
                        recordKind="file"
                        recordId={file.id}
                        recordName={file.name}
                        connections={connections}
                        onUnlink={handleUnlink}
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-5">
                    {isLoadingDetail && !fileDetail && activities.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <FileActivityTab
                        activities={activities}
                        supplementalActivity={supplementalActivity}
                        sourceHistory={sourceHistory}
                        fileName={file.name}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Ask Salt + Quick Actions */}
              <div className="flex gap-2 border-t border-border/60 p-4">
                <button
                  type="button"
                  onClick={handleAskSalt}
                  className="surface-aurora flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
                >
                  <Sparkles className="relative z-10 size-4" strokeWidth={2.5} />
                  <span className="relative z-10">Ask Salt</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 flex-1 gap-2"
                    >
                      <Zap className="size-4" strokeWidth={2} />
                      Quick Actions
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* Document actions */}
                    {(file.kind === "document" || file.kind === "link") && (
                      <DropdownMenuItem onClick={() => toast.info("Send coming soon")}>
                        <Send className="size-4" />
                        Send
                      </DropdownMenuItem>
                    )}
                    {file.kind === "link" && openUrl && (
                      <DropdownMenuItem onClick={handleOpenExternal}>
                        <ExternalLink className="size-4" />
                        Open Link
                      </DropdownMenuItem>
                    )}
                    {(file.kind === "photo" || file.kind === "video") && (
                      <DropdownMenuItem onClick={() => toast.info("Share coming soon")}>
                        <Share2 className="size-4" />
                        Share
                      </DropdownMenuItem>
                    )}
                    {file.kind !== "link" && (
                      <DropdownMenuItem onClick={() => void handleDownload()}>
                        <Download className="size-4" />
                        Download
                      </DropdownMenuItem>
                    )}
                    {file.kind === "document" && (
                      <DropdownMenuItem onClick={() => toast.info("Print coming soon")}>
                        <Printer className="size-4" />
                        Print
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void handleCopyLink()}>
                      <Copy className="size-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isArchiving}
                      onClick={() => void handleArchive()}
                    >
                      <Archive className="size-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete file?"
        description="This permanently removes the file from Files Memory. This cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
        variant="destructive"
      />
    </>
  );
}
