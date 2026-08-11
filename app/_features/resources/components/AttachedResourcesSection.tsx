"use client";

/**
 * AttachedResourcesSection — artifact-first Resources on record detail
 * pages (Phase 7).
 *
 * Renders the record's attached Resources (entity_links attachment edges)
 * as cards with ai_summary previews, plus the "Add a link" quick action
 * (AddResourceDialog prefilled with this record) — the lightweight
 * fallback when no artifact arrived from the source app.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { ConnectionNode } from "@/app/_features/connections/types";
import { getResourceIcon } from "@/app/_lib/resources/icons";
import type { ResourceType } from "@/app/_lib/resources/types";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import { removeMemoryConnection } from "@/app/_features/memory/actions/connections";
import { AddResourceDialog } from "./AddResourceDialog";

type AttachableEntityType = "person" | "org" | "work" | "billing" | "meeting";

type AttachedResourcesSectionProps = {
  entityType: AttachableEntityType;
  entityId: string;
  entityName: string;
  resources: ConnectionNode[];
  onUnlink?: (node: ConnectionNode) => void;
  /** Hide the built-in "Add a link" button when the host renders its own. */
  hideAddAction?: boolean;
};

const addButtonClass =
  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground";

function resourceIcon(node: ConnectionNode) {
  if (node.metadata?.type === "resource") {
    return getResourceIcon(node.metadata.resourceType as ResourceType);
  }
  return FileText;
}

function resourceUrl(node: ConnectionNode): string | null {
  if (node.metadata?.type !== "resource") return null;
  return node.metadata.resourceUrl ? safeHttpUrl(node.metadata.resourceUrl) : null;
}

function resourceSummary(node: ConnectionNode): string | undefined {
  if (node.metadata?.type === "resource" || node.metadata?.type === "file") {
    return node.metadata.aiSummary;
  }
  return undefined;
}

export function AttachedResourcesSection({
  entityType,
  entityId,
  entityName,
  resources,
  onUnlink,
  hideAddAction = false,
}: AttachedResourcesSectionProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUnlink = (node: ConnectionNode) => {
    if (!onUnlink) return;
    const entityIdPart = node.id.split(":")[1] ?? node.id;
    setUnlinkingId(node.id);
    startTransition(async () => {
      const result = await removeMemoryConnection({
        recordKind: entityType,
        recordId: entityId,
        connectionType: "resource",
        connectionId: entityIdPart,
      });
      setUnlinkingId(null);
      if (result.success) {
        toast.success(`Unlinked ${node.label}`);
        onUnlink(node);
      } else {
        toast.error(result.error ?? "Could not unlink resource");
      }
    });
  };

  return (
    <div className="space-y-4">
      {resources.length > 0 && (
        <ul className="space-y-2">
          {resources.map((node) => {
            const Icon = resourceIcon(node);
            const url = resourceUrl(node);
            const summary = resourceSummary(node);
            const entityIdPart = node.id.split(":")[1] ?? node.id;
            return (
              <li
                key={node.id}
                className="group rounded-xl border border-border/50 bg-card/40 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={node.href ?? `/resources?preview=${entityIdPart}`}
                      className="truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {node.label}
                    </Link>
                    {node.sublabel && (
                      <p className="text-xs text-muted-foreground">{node.sublabel}</p>
                    )}
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      aria-label={`Open ${node.label}`}
                    >
                      <ExternalLink className="size-3.5" strokeWidth={2} />
                    </a>
                  )}
                  {onUnlink && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(node)}
                      disabled={isPending && unlinkingId === node.id}
                      aria-label={`Unlink ${node.label}`}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 disabled:opacity-50"
                    >
                      {isPending && unlinkingId === node.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" strokeWidth={2} />
                      )}
                    </button>
                  )}
                </div>
                {summary && (
                  <p className="mt-2 line-clamp-2 border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
                    {summary}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!hideAddAction && (
        <button type="button" onClick={() => setAdding(true)} className={addButtonClass}>
          <Link2 className="size-3.5" strokeWidth={2.25} />
          Add a link
        </button>
      )}

      <AddResourceDialog
        open={adding}
        onOpenChange={setAdding}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}
