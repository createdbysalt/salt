"use client";

import { useState } from "react";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  Archive,
  FileText,
  Film,
  Headphones,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageSquareQuote,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, selectionColumn } from "@/app/_features/memory/components/DataTable";
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
import { archiveMemoryFile } from "../actions/file-actions";
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
  email: Mail,
  transcript: MessageSquareQuote,
};

const KIND_TINT: Record<AssetKind, string> = {
  document: "bg-foreground/8 text-foreground",
  link: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
  photo: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  video: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  audio: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  email: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  transcript: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
};

function subtitleFor(file: MemoryFile): string {
  if (file.kind === "link" && file.domain) return file.domain;
  if (file.kind === "video" || file.kind === "audio" || file.kind === "transcript") {
    const parts: string[] = [];
    if (file.provider) parts.push(PROVIDER_LABEL[file.provider]);
    if (file.durationSec) parts.push(formatDuration(file.durationSec));
    return parts.join(" · ") || ASSET_KIND_LABEL[file.kind];
  }
  if (file.kind === "email") return file.from ? `From ${file.from}` : "Email";
  return FILE_CATEGORY_LABEL[file.category];
}

type FilesDirectoryTableProps = {
  files: MemoryFile[];
  previewId?: string | null;
  onPreviewChange?: (id: string | null) => void;
};

export function FilesDirectoryTable({
  files,
  previewId,
  onPreviewChange,
}: FilesDirectoryTableProps) {
  const [internalPreview, setInternalPreview] = useState<string | null>(null);
  const activePreviewId = previewId !== undefined ? previewId : internalPreview;
  const setPreview = onPreviewChange ?? setInternalPreview;
  const previewFile =
    activePreviewId ? (files.find((f) => f.id === activePreviewId) ?? null) : null;

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
              onClick={() => {
                void Promise.all(selected.map((file) => archiveMemoryFile(file.id))).then(
                  (results) => {
                    const failed = results.filter((result) => !result.ok).length;
                    if (failed > 0) {
                      toast.error(`Could not archive ${failed} file(s)`);
                    } else {
                      toast.success(`Archived ${selected.length} file(s)`);
                    }
                    reset();
                  },
                );
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-foreground/80 transition hover:bg-muted"
            >
              <Archive className="size-3.5" strokeWidth={2} />
              Archive
            </button>
            <button
              type="button"
              onClick={() => {
                toast.error(`Delete ${selected.length} (demo only)`);
                reset();
              }}
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
