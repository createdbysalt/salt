"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MemoryFileDraft } from "@/app/_features/files/actions/memory-file-draft";
import { saveMemoryFileAction } from "@/app/_features/files/actions/save-memory-file";
import { FILE_CATEGORY_LABEL } from "@/app/_features/files/data";
import type { UserAttachmentRef } from "@/app/_features/ask-salt/file-draft-utils";
import { validateFile } from "@/app/_features/relationships/lib/file-validation";

type FileDraftCardProps = {
  draft: MemoryFileDraft;
  attachments: UserAttachmentRef[];
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

export function FileDraftCard({ draft: initialDraft, attachments }: FileDraftCardProps) {
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

      setSavedHref(result.data.href);
      toast.success("Added to Files");
      router.push(result.data.href);
      router.refresh();
    });
  }

  if (savedHref) {
    return (
      <div
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-3"
        data-testid="file-draft-card"
      >
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={2.25} />
          <span className="font-medium">Saved to Files</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
      data-testid="file-draft-card"
    >
      <div className="surface-aurora relative px-3.5 py-3 text-white">
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            <FileText className="size-3.5" strokeWidth={2.25} />
            {initialDraft.fileType === "link" ? "Link ready" : "File ready"}
          </div>
          <p className="mt-2 truncate font-display text-xl tracking-tight">{initialDraft.fileName}</p>
          <p className="mt-1 truncate text-sm text-white/80">
            Connected to {connectedLabel} · {categoryLabel}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Salt prepared this from your conversation. Confirm who it belongs to, then add it to Files
          Memory.
        </p>

        {!initialDraft.person?.id ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Connected to</span>
            <input
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              className="h-9 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
              placeholder="Person or org name"
            />
          </label>
        ) : null}

        {initialDraft.description ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Context
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
              {initialDraft.description}
            </p>
          </div>
        ) : null}

        {initialDraft.fileType === "file" && !attachment?.url ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Attachment no longer available in this chat. Re-attach the file and ask Salt to add it
            again.
          </p>
        ) : null}

        <button
          type="button"
          disabled={isPending || (initialDraft.fileType === "file" && !attachment?.url)}
          onClick={saveDraft}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.25} /> : null}
          Add to Files
        </button>
      </div>
    </div>
  );
}
