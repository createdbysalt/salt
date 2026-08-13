"use client";

/**
 * AddResourcePanel — inline "add a resource" panel for record detail
 * pages. One input: paste a URL (creates + links a new resource via the
 * host's `onCreateFromUrl`) or type to search and link an existing
 * workspace resource. No dialog.
 *
 * Used by Work (WorkResourcesSection) and Meetings (MeetingNotesSection).
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { RESOURCE_TYPE_LABELS } from "@/app/_lib/resources/types";
import { detectResourceFromUrl } from "@/app/_lib/resources/url-detector";
import { getResourceIcon } from "@/app/_lib/resources/icons";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import {
  fetchLinkCandidates,
  persistMemoryConnection,
  type LinkCandidate,
} from "@/app/_features/memory/actions/connections";
import { updateMemoryFileCategory } from "@/app/_features/resources/actions";
import type { FileCategory } from "@/app/_features/resources/data";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

type LinkableRecordKind = "person" | "org" | "work" | "billing" | "meeting" | "resource";

export type CreateFromUrlResult =
  | { ok: true }
  | { ok: false; error: string; existingId?: string };

type AddResourcePanelProps = {
  recordKind: LinkableRecordKind;
  recordId: string;
  linkedResourceIds: string[];
  /** Panel label, e.g. "Add resource" or "Add contract". */
  label: string;
  /** Host-specific URL creation (addResource, linkUrlToMeeting, …). */
  onCreateFromUrl: (_input: {
    url: string;
    displayName?: string;
  }) => Promise<CreateFromUrlResult>;
  /** Re-file a picked existing resource under this category after linking. */
  fileCategoryOnLink?: FileCategory;
  /** Called after an existing resource is linked (optimistic parent state). */
  onLinkedExisting?: (_candidate: LinkCandidate) => void;
  onDone: () => void;
};

const formLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground";

const inlineFormShellClass =
  "space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4";

const inlineInputClass =
  "h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring";

export function AddResourcePanel({
  recordKind,
  recordId,
  linkedResourceIds,
  label,
  onCreateFromUrl,
  fileCategoryOnLink,
  onLinkedExisting,
  onDone,
}: AddResourcePanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [candidates, setCandidates] = useState<LinkCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetchLinkCandidates({
      recordKind,
      recordId,
      existingConnections: linkedResourceIds.map((id) => ({
        id,
        type: "resource",
      })),
    }).then((result) => {
      if (cancelled) return;
      setCandidates(result.filter((c) => c.type === "resource"));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [recordKind, recordId, linkedResourceIds]);

  const trimmed = query.trim();
  const url = trimmed.length > 0 ? safeHttpUrl(trimmed) : null;
  const detection = url ? detectResourceFromUrl(url) : null;

  const filtered = url
    ? []
    : trimmed
      ? candidates.filter((c) =>
          `${c.name} ${c.subtitle ?? ""}`.toLowerCase().includes(trimmed.toLowerCase()),
        )
      : candidates;

  const linkExisting = async (candidateId: string, candidateName: string) => {
    const result = await persistMemoryConnection({
      recordKind,
      recordId,
      connection: {
        id: candidateId,
        name: candidateName,
        type: "resource",
      } as Connection,
    });
    if (!result.success) {
      toast.error(result.error ?? "Could not link resource");
      return false;
    }
    if (fileCategoryOnLink) {
      await updateMemoryFileCategory(candidateId, fileCategoryOnLink);
    }
    toast.success(`Linked ${candidateName}`);
    router.refresh();
    return true;
  };

  const handleSelect = (candidate: LinkCandidate) => {
    setLinkingId(candidate.id);
    linkExisting(candidate.id, candidate.name).then((ok) => {
      setLinkingId(null);
      if (ok) {
        onLinkedExisting?.(candidate);
        onDone();
      }
    });
  };

  const handleCreateAndLink = () => {
    if (!url) return;
    startTransition(async () => {
      const result = await onCreateFromUrl({
        url,
        displayName: displayName.trim() || undefined,
      });

      if (result.ok) {
        toast.success("Resource added");
        router.refresh();
        onDone();
        return;
      }

      // Dedup guard fired — the URL is already a workspace resource, so
      // just link the existing row instead of making the user search for it.
      if (result.existingId) {
        const ok = await linkExisting(
          result.existingId,
          detection?.suggestedName ?? new URL(url).hostname,
        );
        if (ok) onDone();
        return;
      }

      toast.error(result.error);
    });
  };

  const DetectedIcon = detection ? getResourceIcon(detection.resourceType) : null;

  return (
    <div
      className={inlineFormShellClass}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDone();
      }}
    >
      <p className={formLabelClass}>{label}</p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste a URL or search resources…"
          autoFocus
          className={`${inlineInputClass} pl-8`}
        />
      </div>

      {url ? (
        <div className="space-y-3">
          {detection && DetectedIcon && (
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
              <DetectedIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-xs text-muted-foreground">
                Detected: {RESOURCE_TYPE_LABELS[detection.resourceType]}
              </span>
            </div>
          )}
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className={inlineInputClass}
          />
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border/50">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {candidates.length === 0
                ? "No resources yet — paste a URL above to add one."
                : "No resources match your search."}
            </p>
          ) : (
            filtered.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => handleSelect(candidate)}
                disabled={linkingId !== null}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/50 disabled:opacity-50"
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
                  <FileText className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{candidate.name}</p>
                  {candidate.subtitle && (
                    <p className="text-xs text-muted-foreground">{candidate.subtitle}</p>
                  )}
                </div>
                {linkingId === candidate.id && (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onDone}
          disabled={isPending}
        >
          Cancel
        </Button>
        {url && (
          <Button
            type="button"
            size="sm"
            className="h-8 px-4"
            onClick={handleCreateAndLink}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Create and link"}
          </Button>
        )}
      </div>
    </div>
  );
}
