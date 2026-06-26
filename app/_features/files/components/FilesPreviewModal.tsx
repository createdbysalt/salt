"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Mail,
  MoreHorizontal,
  Sparkles,
  Trash2,
  X,
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
import {
  deleteFile,
  getFileDownloadUrl,
  getFilePreviewUrl,
  updateFileDescription,
} from "@/app/_features/people/actions/files/update-client-file";
import { archiveMemoryFile } from "../actions/file-actions";
import {
  ASSET_KIND_LABEL,
  FILE_CATEGORY_LABEL,
  PROVIDER_LABEL,
  relativeDays,
  type MemoryFile,
} from "../data";
import { SourceChip } from "@/app/_features/memory/components/SourceChip";
import { askSaltContextForFile, openAskSalt } from "../utils/open-ask-salt";
import {
  fileLinkDestinationHint,
  fileLinkOpenLabel,
  fileLinkPlatformLabel,
} from "../utils/link-display";
import { FileConnectionPicker } from "./FileConnectionPicker";
import { FileAssetPreviewPanel } from "./FileAssetPreviewPanel";

type FilesPreviewModalProps = {
  file: MemoryFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isPreviewableImage(mimeType: string | null | undefined): boolean {
  return Boolean(mimeType?.startsWith("image/"));
}

function isPreviewablePdf(mimeType: string | null | undefined): boolean {
  return mimeType === "application/pdf";
}

function assetPreviewIcon(file: MemoryFile) {
  if (file.kind === "link") return Link2;
  if (file.kind === "email") return Mail;
  return FileText;
}

function assetPreviewEyebrow(file: MemoryFile, providerLabel: string): string {
  const platformLabel = fileLinkPlatformLabel(file);
  if (platformLabel) return platformLabel.toUpperCase();
  if (file.provider) return providerLabel.toUpperCase();
  return ASSET_KIND_LABEL[file.kind].toUpperCase();
}

export function FilesPreviewModal({ file, open, onOpenChange }: FilesPreviewModalProps) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [contextDraft, setContextDraft] = React.useState("");
  const [isSavingContext, setIsSavingContext] = React.useState(false);

  React.useEffect(() => {
    if (!open || !file) {
      setPreviewUrl(null);
      return;
    }

    setContextDraft(file.description ?? "");

    if (file.kind === "link" && file.url) {
      setPreviewUrl(file.url);
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

  const providerLabel = file.provider ? PROVIDER_LABEL[file.provider] : ASSET_KIND_LABEL[file.kind];
  const openUrl = file.url ?? previewUrl;
  const askLabel =
    file.kind === "link" ? "Ask Salt about this link" : "Ask Salt about this file";
  const contextText = file.description?.trim() || file.aiSummary?.trim() || "";

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

  const handleSaveContext = async () => {
    setIsSavingContext(true);
    const result = await updateFileDescription(file.id, contextDraft.trim());
    setIsSavingContext(false);

    if (!result.success) {
      toast.error(result.error ?? "Could not save context");
      return;
    }

    toast.success("Context saved");
    refreshFile();
  };

  const handleAskSalt = () => {
    onOpenChange(false);
    openAskSalt({
      prompt: `Review "${file.name}" and tell me what matters.`,
      context: askSaltContextForFile(file),
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
                      eyebrow={assetPreviewEyebrow(file, providerLabel)}
                      title={file.name}
                      description={contextText || undefined}
                      openLabel={openUrl ? fileLinkOpenLabel(file) : undefined}
                      openHint={openUrl ? fileLinkDestinationHint(file) : undefined}
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

            <div className="flex w-full shrink-0 flex-col border-t border-border/60 md:w-[340px] md:border-l md:border-t-0">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {ASSET_KIND_LABEL[file.kind]}
                    </span>
                    {file.provider ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {providerLabel}
                      </span>
                    ) : null}
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

              <div
                data-file-preview-sidebar-scroll
                className="flex-1 space-y-6 overflow-y-auto px-5 py-5"
              >
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

                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Context
                    </h4>
                    {contextDraft.trim() !== (file.description ?? "").trim() ? (
                      <button
                        type="button"
                        disabled={isSavingContext}
                        onClick={() => void handleSaveContext()}
                        className="text-xs font-medium text-foreground transition hover:opacity-70 disabled:opacity-50"
                      >
                        {isSavingContext ? "Saving…" : "Save"}
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    value={contextDraft}
                    onChange={(event) => setContextDraft(event.target.value)}
                    placeholder="What is this file? Why does it matter?"
                    rows={4}
                    className="mt-3 w-full resize-y rounded-2xl border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
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

                <section>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Connections
                  </h4>
                  <div className="mt-3">
                    <FileConnectionPicker
                      fileId={file.id}
                      linkedTo={file.linkedTo}
                      onUpdated={refreshFile}
                    />
                  </div>
                </section>
              </div>

              <div className="border-t border-border/60 p-4">
                <button
                  type="button"
                  onClick={handleAskSalt}
                  className="surface-aurora flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
                >
                  <Sparkles className="relative z-10 size-4" strokeWidth={2.5} />
                  <span className="relative z-10">{askLabel}</span>
                </button>
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
