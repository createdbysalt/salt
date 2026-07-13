"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MemoryFileDraft } from "@/app/_features/files/actions/memory-file-draft";
import { saveMemoryFileAction } from "@/app/_features/files/actions/save-memory-file";
import { FILE_CATEGORY_LABEL } from "@/app/_features/files/data";
import type { UserAttachmentRef } from "@/app/_features/ask-salt/file-draft-utils";
import { validateFile } from "@/app/_features/relationships/lib/file-validation";

type FileDraftCardProps = {
  draft: MemoryFileDraft;
  attachments: UserAttachmentRef[];
  navigateOnSave?: boolean;
  onComplete?: (href: string) => void;
};

function fileFromDataUrl(attachment: UserAttachmentRef, fallbackName: string): File {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(attachment.url);
  if (!match) {
    throw new Error("Invalid data URL");
  }

  const [, dataUrlMediaType, base64Marker, encodedData] = match;
  const mediaType =
    dataUrlMediaType || attachment.mediaType || "application/octet-stream";
  const bytes = base64Marker
    ? Uint8Array.from(atob(encodedData), (character) => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(encodedData));

  return new File([bytes], attachment.filename ?? fallbackName, { type: mediaType });
}

function canFetchAttachmentUrl(url: string): boolean {
  if (url.startsWith("blob:")) return true;

  try {
    const parsed = new URL(url, window.location.href);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.origin === window.location.origin
    );
  } catch {
    return false;
  }
}

async function fileFromAttachment(
  attachment: UserAttachmentRef,
  fallbackName: string,
): Promise<File> {
  if (attachment.url.startsWith("data:")) {
    return fileFromDataUrl(attachment, fallbackName);
  }

  if (!canFetchAttachmentUrl(attachment.url)) {
    throw new Error("Unsupported attachment URL");
  }

  const response = await fetch(attachment.url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error("Attachment fetch failed");
  }

  const blob = await response.blob();
  return new File([blob], attachment.filename ?? fallbackName, {
    type: attachment.mediaType ?? (blob.type || "application/octet-stream"),
  });
}

export function FileDraftCard({
  draft: initialDraft,
  attachments,
  navigateOnSave = true,
  onComplete,
}: FileDraftCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [personName, setPersonName] = useState(
    initialDraft.person?.name ?? initialDraft.personName ?? "",
  );

  useEffect(() => {
    setPersonName(initialDraft.person?.name ?? initialDraft.personName ?? "");
    setSavedHref(null);
  }, [initialDraft]);

  const connectedLabel = initialDraft.work?.name ?? (personName || "Unlinked");
  const categoryLabel = FILE_CATEGORY_LABEL[initialDraft.category ?? "other"];
  const attachment =
    initialDraft.fileType === "file"
      ? attachments[initialDraft.attachmentIndex ?? 0]
      : undefined;
  const fileTypeLabel =
    initialDraft.fileType === "link" ? "Link" : "File";

  function saveDraft() {
    startTransition(async () => {
      const draft: MemoryFileDraft = {
        ...initialDraft,
        personName: personName.trim() || initialDraft.personName,
        person: initialDraft.person?.id
          ? { id: initialDraft.person.id, name: personName.trim() || initialDraft.person.name }
          : undefined,
      };

      let formData: FormData | undefined;
      if (draft.fileType === "file") {
        if (!attachment?.url) {
          toast.error("Attachment unavailable. Re-attach the file and ask Salt again.");
          return;
        }

        try {
          const file = await fileFromAttachment(attachment, draft.fileName);
          const validation = validateFile(file);
          if (!validation.valid) {
            toast.error(validation.error ?? "Unsupported file type.");
            return;
          }

          formData = new FormData();
          formData.set("file", file);
        } catch {
          toast.error("Could not read the attachment. Try uploading again.");
          return;
        }
      }

      const result = await saveMemoryFileAction(draft, formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (onComplete) {
        toast.success("Added to Files");
        onComplete(result.data.href);
      } else {
        setSavedHref(result.data.href);
        toast.success("Added to Files");
        if (navigateOnSave) {
          router.push(result.data.href);
        }
      }
      router.refresh();
    });
  }

  if (savedHref) {
    return (
      <article
        className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
        data-testid="file-draft-card"
      >
        <div className="surface-aurora relative px-4 py-4 text-white sm:px-5 sm:py-4">
          <div className="relative z-10 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              <FileText className="size-3.5 shrink-0" strokeWidth={2.25} />
              Files
            </div>
            <p className="mt-2.5 break-words font-display text-[1.35rem] leading-tight tracking-tight text-white">
              {initialDraft.fileName}
            </p>
            <p className="mt-1.5 text-sm text-white/75">Added to Memory</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/50 px-4 py-3.5">
          <Link
            href={savedHref}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            Open in Files
            <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2.25} />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
      data-testid="file-draft-card"
    >
      <div className="surface-aurora relative px-4 py-4 text-white sm:px-5 sm:py-4">
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            <FileText className="size-3.5 shrink-0" strokeWidth={2.25} />
            Files
          </div>
          <p className="mt-2.5 break-words font-display text-[1.35rem] leading-tight tracking-tight text-white">
            {initialDraft.fileName}
          </p>
          <p className="mt-1.5 break-words text-sm text-white/75">
            {fileTypeLabel} · Connected to {connectedLabel} · {categoryLabel}
          </p>
          {initialDraft.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-white/65">
              {initialDraft.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/50 px-4 py-3.5">
        {!initialDraft.person?.id ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Connected to</span>
            <input
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              className="h-10 w-full rounded-full border border-border/60 bg-background px-4 text-sm"
              placeholder="Person or org name"
            />
          </label>
        ) : null}

        {initialDraft.fileType === "file" && !attachment?.url ? (
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            Attachment no longer available. Re-attach the file and ask Salt again.
          </p>
        ) : null}

        <button
          type="button"
          disabled={isPending || (initialDraft.fileType === "file" && !attachment?.url)}
          onClick={saveDraft}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.25} /> : null}
          Add to Files
        </button>
      </div>
    </article>
  );
}
