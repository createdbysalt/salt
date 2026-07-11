"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  Archive,
  FileText,
  Film,
  Headphones,
  Image as ImageIcon,
  Link2,
  MessageSquareQuote,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
import { bulkArchive, bulkTrash } from "@/app/_features/memory/actions/trash";
import { MemoryTrashMenuLink } from "@/app/_features/memory/components/MemoryTrashMenuLink";
import { SourceChip } from "@/app/_features/memory/components/SourceChip";
import {
  ASSET_KIND_LABEL,
  FILE_CATEGORY_LABEL,
  PROVIDER_LABEL,
  formatDuration,
  relativeDays,
  type AssetKind,
  hasDisplayableFileConnection,
  type MemoryFile,
} from "../data";
import { FilesPreviewModal } from "./FilesPreviewModal";
import { askSaltContextForFiles, openAskSalt } from "../utils/open-ask-salt";

const multiFilter: FilterFn<MemoryFile> = (row, id, value) => {
  const filters = value as string[] | undefined;
  if (!filters?.length) return true;
  return filters.includes(String(row.getValue(id)));
};

const KIND_ICON: Record<AssetKind, typeof FileText> = {
  document: FileText,
  link: Link2,
  photo: ImageIcon,
  video: Film,
  audio: Headphones,
  transcript: MessageSquareQuote,
  other: FileText,
};

const KIND_TINT: Record<AssetKind, string> = {
  document: "bg-foreground/8 text-foreground",
  link: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
  photo: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  video: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  audio: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  transcript: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
  other: "bg-muted text-muted-foreground",
};

function subtitleFor(file: MemoryFile): string {
  if (file.kind === "link" && file.domain) return file.domain;
  if (file.kind === "video" || file.kind === "audio" || file.kind === "transcript") {
    const parts: string[] = [];
    if (file.provider) parts.push(PROVIDER_LABEL[file.provider]);
    if (file.durationSec) parts.push(formatDuration(file.durationSec));
    return parts.join(" · ") || ASSET_KIND_LABEL[file.kind];
  }
  return FILE_CATEGORY_LABEL[file.category];
}

type FilesDirectoryTableProps = {
  files: MemoryFile[];
  previewId?: string | null;
  onPreviewChange?: (id: string | null) => void;
};

function stubPreviewFile(id: string): MemoryFile {
  return {
    id,
    name: "Untitled file",
    kind: "link",
    category: "other",
    updatedAt: new Date().toISOString(),
    linkedTo: { kind: "person", id: "pending", name: "General" },
    source: "user",
    tags: [],
  };
}

export function FilesDirectoryTable({
  files,
  previewId,
  onPreviewChange,
}: FilesDirectoryTableProps) {
  const router = useRouter();
  const [internalPreview, setInternalPreview] = useState<string | null>(null);
  const activePreviewId = previewId !== undefined ? previewId : internalPreview;
  const setPreview = onPreviewChange ?? setInternalPreview;
  const previewFile = activePreviewId
    ? (files.find((f) => f.id === activePreviewId) ?? stubPreviewFile(activePreviewId))
    : null;

  async function handleBulkArchive(selected: MemoryFile[], reset: () => void) {
    const result = await bulkArchive(
      selected.map((f) => ({ entityType: "file" as const, id: f.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Archived ${selected.length} ${selected.length === 1 ? "file" : "files"}`,
    );
    reset();
    router.refresh();
  }

  async function handleBulkDelete(selected: MemoryFile[], reset: () => void) {
    const confirmed = window.confirm(
      `Move ${selected.length} ${selected.length === 1 ? "file" : "files"} to Trash?`,
    );
    if (!confirmed) return;
    const result = await bulkTrash(
      selected.map((f) => ({ entityType: "file" as const, id: f.id })),
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    // #region agent log
    fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a1002e" },
      body: JSON.stringify({
        sessionId: "a1002e",
        runId: "files-delete-fix",
        hypothesisId: "H1-stub",
        location: "FilesDirectoryTable:handleBulkDelete",
        message: "File bulk trash succeeded",
        data: { count: selected.length, ids: selected.map((f) => f.id) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    toast.success(
      `Moved ${selected.length} ${selected.length === 1 ? "file" : "files"} to Trash`,
    );
    reset();
    router.refresh();
  }

  const columns: ColumnDef<MemoryFile>[] = [
    selectionColumn<MemoryFile>(),
    {
      accessorKey: "name",
      header: "Asset",
      cell: ({ row }) => {
        const file = row.original;
        const Icon = KIND_ICON[file.kind];
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`grid size-8 shrink-0 place-items-center rounded-xl ${KIND_TINT[file.kind]}`}
            >
              <Icon className="size-3.5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="truncate text-xs text-muted-foreground">{subtitleFor(file)}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "kind",
      header: "Type",
      filterFn: multiFilter,
      cell: ({ getValue }) => (
        <span className="text-sm text-foreground/80">
          {ASSET_KIND_LABEL[getValue<AssetKind>()]}
        </span>
      ),
    },
    {
      id: "linkedTo",
      accessorFn: (file) => file.linkedTo.name,
      header: "Connected to",
      cell: ({ row }) => {
        const linkedTo = row.original.linkedTo;
        return (
          <span className="text-sm text-foreground/80">
            {hasDisplayableFileConnection(linkedTo) ? linkedTo.name : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {relativeDays(getValue<string>())}
        </span>
      ),
      sortingFn: (a, b, id) =>
        new Date(b.getValue<string>(id)).getTime() - new Date(a.getValue<string>(id)).getTime(),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => <SourceChip source={row.original.source} />,
    },
  ];

  const filters = [
    {
      columnId: "kind",
      label: "Type",
      options: Object.entries(ASSET_KIND_LABEL).map(([value, label]) => ({ value, label })),
    },
  ];

  return (
    <>
      <DataTable
        data={files}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search files, links, people, orgs…"
        globalFilterFn={(row, _id, value) => {
          const v = String(value).toLowerCase();
          const f = row.original;
          return (
            f.name.toLowerCase().includes(v) ||
            f.linkedTo.name.toLowerCase().includes(v) ||
            f.tags.some((t) => t.toLowerCase().includes(v))
          );
        }}
        onRowClick={(file) => setPreview(file.id)}
        displayMenuFooter={<MemoryTrashMenuLink entityType="file" />}
        bulkActions={(selected, reset) => (
          <>
            <button
              type="button"
              onClick={() => {
                openAskSalt({
                  prompt: `Review these ${selected.length} files and tell me what matters.`,
                  context: askSaltContextForFiles(selected),
                });
                reset();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90"
            >
              <Sparkles className="size-3.5" strokeWidth={2.5} />
              Ask Salt
            </button>
            <button
              type="button"
              onClick={() => void handleBulkArchive(selected, reset)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-foreground/80 transition hover:bg-muted"
            >
              <Archive className="size-3.5" strokeWidth={2} />
              Archive
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete(selected, reset)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
              Delete
            </button>
          </>
        )}
      />

      <FilesPreviewModal
        file={previewFile}
        open={Boolean(previewFile)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreview(null);
        }}
      />
    </>
  );
}
