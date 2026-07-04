"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@repo/ui";
import { cn } from "@repo/utils";
import type { MemoryFile } from "@/app/_features/files/data";
import { FILE_CATEGORY_LABEL } from "@/app/_features/files/data";
import { FilesPreviewModal } from "@/app/_features/files/components/FilesPreviewModal";
import { uploadClientFile } from "@/app/_features/people/actions/files/upload-client-file";

function relativeUpdated(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

function kindIcon(file: MemoryFile) {
  if (file.kind === "link") return Link2;
  if (file.kind === "photo" || file.mimeType?.startsWith("image/")) return ImageIcon;
  return FileText;
}

function CategoryChip({ category }: { category: MemoryFile["category"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
      {FILE_CATEGORY_LABEL[category] ?? category}
    </span>
  );
}

function SwatchRow({ file }: { file: MemoryFile }) {
  const colors = file.brandMetadata?.colors ?? [];
  if (colors.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {colors.slice(0, 5).map((color, index) => (
        <button
          key={`${color.hex}-${index}`}
          type="button"
          title={color.role && color.role !== "neutral" ? `${color.hex} — ${color.role}` : color.hex}
          aria-label={`Copy ${color.hex}`}
          onClick={(event) => {
            event.stopPropagation();
            void navigator.clipboard.writeText(color.hex);
            toast(`Copied ${color.hex}`);
          }}
          className="size-4 rounded-full ring-1 ring-inset ring-border/60 transition hover:scale-110"
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  );
}

function BrandAssetCard({
  file,
  onOpen,
}: {
  file: MemoryFile;
  onOpen: (file: MemoryFile) => void;
}) {
  const Icon = kindIcon(file);
  const tileColor = file.brandMetadata?.colors?.find((c) => c.role === "primary")?.hex;
  return (
    // div, not button: the swatch row nests real buttons inside the card
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(file)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(file);
        }
      }}
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className="grid h-16 w-full place-items-center rounded-xl bg-muted"
        style={tileColor ? { backgroundColor: `${tileColor}1a` } : undefined}
      >
        <Icon
          className="size-6 text-foreground/60"
          strokeWidth={1.75}
          style={tileColor ? { color: tileColor } : undefined}
        />
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {file.brandMetadata?.variant
              ? `${file.brandMetadata.variant} · ${relativeUpdated(file.updatedAt)}`
              : relativeUpdated(file.updatedAt)}
          </span>
          <SwatchRow file={file} />
        </div>
      </div>
    </div>
  );
}

export function MeFilesTab({ files }: { files: MemoryFile[] }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<MemoryFile | null>(null);

  const matches = React.useCallback(
    (file: MemoryFile) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        file.name.toLowerCase().includes(q) ||
        (FILE_CATEGORY_LABEL[file.category] ?? "").toLowerCase().includes(q)
      );
    },
    [query],
  );

  const brandAssets = files.filter((f) => f.category === "brand_asset" && matches(f));
  const documents = files.filter((f) => f.category !== "brand_asset" && matches(f));

  const uploadFiles = React.useCallback(
    async (list: FileList | File[]) => {
      const items = Array.from(list);
      if (items.length === 0) return;
      setUploading(true);
      let uploaded = 0;
      for (const file of items) {
        const formData = new FormData();
        formData.append("file", file);
        const isBrandImage = file.type.startsWith("image/");
        const result = await uploadClientFile(formData, {
          category: isBrandImage ? "brand_asset" : "other",
          isOperatorAsset: true,
        });
        if (result.success) {
          uploaded += 1;
        } else {
          toast.error(`Could not upload ${file.name}: ${result.error ?? "unknown error"}`);
        }
      }
      setUploading(false);
      if (uploaded > 0) {
        toast.success(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`);
        router.refresh();
      }
    },
    [router],
  );

  return (
    <div
      className={cn(
        "space-y-6 rounded-2xl transition",
        dragging && "ring-2 ring-ring/60 ring-offset-2 ring-offset-background",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void uploadFiles(event.dataTransfer.files);
      }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files…"
            className="h-9 rounded-full border-border/60 bg-card pl-9"
          />
        </div>
        <div className="ml-auto">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Upload className="size-4" strokeWidth={2} />
            )}
            Upload file
          </button>
        </div>
      </div>

      {/* Brand kit */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Brand kit
          </p>
          {brandAssets.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {brandAssets.length} {brandAssets.length === 1 ? "asset" : "assets"}
            </span>
          )}
        </div>
        {brandAssets.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {brandAssets.map((file) => (
              <BrandAssetCard key={file.id} file={file} onOpen={setPreviewFile} />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid w-full place-items-center gap-1 rounded-2xl border border-dashed border-border/80 bg-card/50 px-4 py-10 text-center transition hover:border-border"
          >
            <span className="text-sm font-medium text-foreground">Upload your logo</span>
            <span className="text-xs text-muted-foreground">
              Salt uses your brand assets to keep generated work on-brand
            </span>
          </button>
        )}
      </section>

      {/* Documents */}
      <section className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Documents
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          {documents.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {documents.map((file) => {
                const Icon = kindIcon(file);
                return (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                        <Icon className="size-4 text-foreground/70" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {file.name}
                        </span>
                      </span>
                      <CategoryChip category={file.category} />
                      <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                        {relativeUpdated(file.updatedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No documents yet. Drop contracts, rate cards, or templates here.
            </p>
          )}
        </div>
      </section>

      {previewFile && (
        <FilesPreviewModal
          file={previewFile}
          open
          onOpenChange={(open) => {
            if (!open) setPreviewFile(null);
          }}
        />
      )}
    </div>
  );
}
