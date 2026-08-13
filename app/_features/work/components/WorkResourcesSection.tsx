"use client";

/**
 * WorkResourcesSection — the work record's artifacts on the overview:
 * a Contract / Service Agreement subsection (resources filed with
 * category "contract") and a general Resources subsection (links and
 * uploads, incl. live links like a GitHub repo).
 *
 * Adding uses the shared inline AddResourcePanel: paste a URL (creates
 * + links) or search and link an existing resource — no dialog.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Resource } from "@/app/_lib/resources/types";
import { getResourceIcon } from "@/app/_lib/resources/icons";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import { removeMemoryConnection } from "@/app/_features/memory/actions/connections";
import { addResource } from "@/app/_features/resources/actions";
import { AddResourcePanel } from "@/app/_features/resources/components/AddResourcePanel";
import { splitWorkResources } from "@/app/_features/work/utils/work-resources";

type WorkResourcesSectionProps = {
  workId: string;
  resources: Resource[];
};

const addButtonClass =
  "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground";

function formatSignedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLifecycleStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function WorkResourcesSection({
  workId,
  resources,
}: WorkResourcesSectionProps) {
  const router = useRouter();
  const [contractAdding, setContractAdding] = useState(false);
  const [resourceAdding, setResourceAdding] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { contracts, other } = splitWorkResources(resources);
  const linkedResourceIds = resources.map((r) => r.id);

  const handleUnlink = (resource: Resource) => {
    setUnlinkingId(resource.id);
    startTransition(async () => {
      const result = await removeMemoryConnection({
        recordKind: "work",
        recordId: workId,
        connectionType: "resource",
        connectionId: resource.id,
      });
      setUnlinkingId(null);
      if (result.success) {
        toast.success(`Unlinked ${resource.name}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not unlink resource");
      }
    });
  };

  const renderRow = (resource: Resource, showContractMeta: boolean) => {
    const Icon = getResourceIcon(resource.resourceType);
    const url = resource.resourceUrl ? safeHttpUrl(resource.resourceUrl) : null;
    const isLive = resource.mode === "live";
    const unlinking = isPending && unlinkingId === resource.id;

    return (
      <li
        key={resource.id}
        className="group rounded-xl border border-border/50 bg-card/40 p-3"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/resources?preview=${resource.id}`}
                className="truncate text-sm font-medium text-foreground hover:underline"
              >
                {resource.name}
              </Link>
              {isLive && (
                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                  Live
                </span>
              )}
              {showContractMeta && resource.lifecycleStatus && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {formatLifecycleStatus(resource.lifecycleStatus)}
                </span>
              )}
            </div>
            {showContractMeta && resource.signedDate && (
              <p className="text-xs text-muted-foreground">
                Signed {formatSignedDate(resource.signedDate)}
              </p>
            )}
            {isLive && resource.lastActivitySummary && (
              <p className="truncate text-xs text-muted-foreground">
                {resource.lastActivitySummary}
              </p>
            )}
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
              aria-label={`Open ${resource.name}`}
            >
              <ExternalLink className="size-3.5" strokeWidth={2} />
            </a>
          )}
          <button
            type="button"
            onClick={() => handleUnlink(resource)}
            disabled={unlinking}
            aria-label={`Unlink ${resource.name}`}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 disabled:opacity-50"
          >
            {unlinking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" strokeWidth={2} />
            )}
          </button>
        </div>
        {resource.aiSummary && (
          <p className="mt-2 line-clamp-2 border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
            {resource.aiSummary}
          </p>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Contract / Service Agreement
        </h3>
        {contracts.length > 0 && (
          <ul className="space-y-2">
            {contracts.map((resource) => renderRow(resource, true))}
          </ul>
        )}
        {contractAdding ? (
          <AddResourcePanel
            recordKind="work"
            recordId={workId}
            linkedResourceIds={linkedResourceIds}
            label="Add contract"
            fileCategoryOnLink="contract"
            onCreateFromUrl={async ({ url, displayName }) => {
              const result = await addResource({
                entityType: "work",
                entityId: workId,
                resourceUrl: url,
                displayName,
                mode: "static",
                source: "manual",
                defaultCategory: "contract",
              });
              return result.success
                ? { ok: true }
                : {
                    ok: false,
                    error: result.error ?? "Failed to add contract",
                    existingId: "existingId" in result ? result.existingId : undefined,
                  };
            }}
            onDone={() => setContractAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setContractAdding(true)}
            className={addButtonClass}
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add contract
          </button>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Work Resources
        </h3>
        {other.length > 0 && (
          <ul className="space-y-2">
            {other.map((resource) => renderRow(resource, false))}
          </ul>
        )}
        {resourceAdding ? (
          <AddResourcePanel
            recordKind="work"
            recordId={workId}
            linkedResourceIds={linkedResourceIds}
            label="Add resource"
            onCreateFromUrl={async ({ url, displayName }) => {
              const result = await addResource({
                entityType: "work",
                entityId: workId,
                resourceUrl: url,
                displayName,
                mode: "static",
                source: "manual",
              });
              return result.success
                ? { ok: true }
                : {
                    ok: false,
                    error: result.error ?? "Failed to add resource",
                    existingId: "existingId" in result ? result.existingId : undefined,
                  };
            }}
            onDone={() => setResourceAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setResourceAdding(true)}
            className={addButtonClass}
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add resource
          </button>
        )}
      </div>
    </div>
  );
}
