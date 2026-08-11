"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Figma,
  Github,
  Link2,
  Loader2,
  Plus,
  Search,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import {
  fetchLinkCandidates,
  persistMemoryConnection,
  removeMemoryConnection,
  type LinkCandidate,
} from "@/app/_features/memory/actions/connections";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { ConnectionNode } from "@/app/_features/connections/types";
import type { MeetingSource } from "../queries";
import { addMeetingSource } from "../actions";
import type { SourceProvider } from "../actions/schemas";

type MeetingNotesSectionProps = {
  meetingId: string;
  resourceConnections: ConnectionNode[];
  linkedFileSources: MeetingSource[];
  existingConnections: Connection[];
  onLinkResource: (connection: Connection) => void;
  onUnlinkResource: (node: ConnectionNode) => void;
};

const formLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground";

const inlineFormShellClass =
  "space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4";

const addButtonClass =
  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground";

const inlineInputClass =
  "h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring";

const PROVIDER_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  "google-drive": { icon: FileText, label: "Google Drive" },
  figma: { icon: Figma, label: "Figma" },
  notion: { icon: FileText, label: "Notion" },
  loom: { icon: Video, label: "Loom" },
  miro: { icon: FileText, label: "Miro" },
  linear: { icon: FileText, label: "Linear" },
  github: { icon: Github, label: "GitHub" },
  slack: { icon: FileText, label: "Slack" },
  dropbox: { icon: FileText, label: "Dropbox" },
  other: { icon: ExternalLink, label: "Link" },
};

// Match on the parsed hostname, not a substring — "evil.com/figma.com"
// or "figma.com.evil.com" must not classify as a trusted provider.
function detectProvider(url: string): SourceProvider {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);

  if (isHost("docs.google.com") || isHost("drive.google.com")) return "google-drive";
  if (isHost("figma.com")) return "figma";
  if (isHost("notion.so") || isHost("notion.site")) return "notion";
  if (isHost("loom.com")) return "loom";
  if (isHost("miro.com")) return "miro";
  if (isHost("linear.app")) return "linear";
  if (isHost("github.com")) return "github";
  if (isHost("slack.com")) return "slack";
  if (isHost("dropbox.com")) return "dropbox";
  return "other";
}

function getDisplayName(source: MeetingSource): string {
  if (source.displayName) return source.displayName;
  const safeUrl = safeHttpUrl(source.sourceUrl);
  if (safeUrl) {
    try {
      const url = new URL(safeUrl);
      const last = url.pathname.split("/").filter(Boolean).pop();
      return last ? decodeURIComponent(last).replace(/[-_]/g, " ") : url.hostname;
    } catch {
      return "Linked file";
    }
  }
  return "Linked file";
}

function ResourceLinkForm({
  meetingId,
  existingConnections,
  onLink,
  onCancel,
}: {
  meetingId: string;
  existingConnections: Connection[];
  onLink: (connection: Connection) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<LinkCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLinkCandidates({
      recordKind: "meeting",
      recordId: meetingId,
      existingConnections: existingConnections.map((c) => ({ id: c.id, type: c.type })),
    }).then((result) => {
      if (cancelled) return;
      setCandidates(result.filter((c) => c.type === "resource"));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [meetingId, existingConnections]);

  const filtered = query.trim()
    ? candidates.filter((c) =>
        `${c.name} ${c.subtitle ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : candidates;

  const handleSelect = (candidate: LinkCandidate) => {
    setLinkingId(candidate.id);
    persistMemoryConnection({
      recordKind: "meeting",
      recordId: meetingId,
      connection: {
        id: candidate.id,
        name: candidate.name,
        type: candidate.type,
        subtitle: candidate.subtitle,
      } as Connection,
    }).then((result) => {
      setLinkingId(null);
      if (!result.success) {
        toast.error(result.error ?? "Could not link resource");
        return;
      }
      toast.success(`Linked ${candidate.name}`);
      onLink({
        id: candidate.id,
        name: candidate.name,
        type: candidate.type,
        subtitle: candidate.subtitle,
      } as Connection);
    });
  };

  return (
    <div
      className={inlineFormShellClass}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <p className={formLabelClass}>Link from Resources</p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resources…"
          autoFocus
          className={`${inlineInputClass} pl-8`}
        />
      </div>

      <div className="max-h-48 overflow-y-auto rounded-xl border border-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {candidates.length === 0
              ? "No resources yet — add one from the Resources page first."
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

      <div className="flex items-center justify-end border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function UrlLinkForm({
  meetingId,
  onLinked,
  onCancel,
}: {
  meetingId: string;
  onLinked: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const detectedProvider = url.startsWith("http") ? detectProvider(url) : null;
  const detectedConfig = detectedProvider ? PROVIDER_CONFIG[detectedProvider] : null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }
    if (!safeHttpUrl(trimmedUrl)) {
      setError("Please enter a valid http or https URL");
      return;
    }

    startTransition(async () => {
      const result = await addMeetingSource({
        meetingId,
        provider: detectProvider(trimmedUrl),
        kind: "linked_file",
        sourceUrl: trimmedUrl,
        displayName: displayName.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success("Link added");
      router.refresh();
      onLinked();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={inlineFormShellClass}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <p className={formLabelClass}>Link URL</p>

      <div className="space-y-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/…"
          autoFocus
          className={inlineInputClass}
        />
        {detectedConfig && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <detectedConfig.icon className="size-3.5" strokeWidth={1.75} />
            Detected: {detectedConfig.label}
          </p>
        )}
      </div>

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name (optional)"
        className={inlineInputClass}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-8 px-4" disabled={isPending || !url.trim()}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Link URL"}
        </Button>
      </div>
    </form>
  );
}

export function MeetingNotesSection({
  meetingId,
  resourceConnections,
  linkedFileSources,
  existingConnections,
  onLinkResource,
  onUnlinkResource,
}: MeetingNotesSectionProps) {
  const [adding, setAdding] = useState<"resource" | "url" | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const openPicker = () => setAdding("resource");
    window.addEventListener("meeting:link-resource", openPicker);
    return () => window.removeEventListener("meeting:link-resource", openPicker);
  }, []);

  const handleUnlink = (node: ConnectionNode) => {
    const entityId = node.id.split(":")[1] ?? node.id;
    setUnlinkingId(node.id);
    startTransition(async () => {
      const result = await removeMemoryConnection({
        recordKind: "meeting",
        recordId: meetingId,
        connectionType: "resource",
        connectionId: entityId,
      });
      setUnlinkingId(null);
      if (result.success) {
        toast.success(`Unlinked ${node.label}`);
        onUnlinkResource(node);
      } else {
        toast.error(result.error ?? "Could not unlink resource");
      }
    });
  };

  const hasLinkedItems = resourceConnections.length > 0 || linkedFileSources.length > 0;

  return (
    <div className="space-y-4">
      {hasLinkedItems && (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/50 px-3">
          {resourceConnections.map((node) => {
            const entityId = node.id.split(":")[1] ?? node.id;
            return (
              <li key={node.id} className="group flex items-center gap-3 py-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                  <FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={node.href ?? `/resources?preview=${entityId}`}
                    className="truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {node.label}
                  </Link>
                  {node.sublabel && (
                    <p className="text-xs text-muted-foreground">{node.sublabel}</p>
                  )}
                </div>
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
              </li>
            );
          })}
          {linkedFileSources.map((source) => {
            const config = PROVIDER_CONFIG[source.provider] ?? PROVIDER_CONFIG.other;
            const Icon = config.icon;
            const safeUrl = safeHttpUrl(source.sourceUrl);
            return (
              <li key={source.id} className="group flex items-center gap-3 py-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {getDisplayName(source)}
                  </p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
                {safeUrl && (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    aria-label={`Open ${getDisplayName(source)}`}
                  >
                    <ExternalLink className="size-3.5" strokeWidth={2} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding === "resource" ? (
        <ResourceLinkForm
          meetingId={meetingId}
          existingConnections={existingConnections}
          onLink={(connection) => {
            onLinkResource(connection);
            setAdding(null);
          }}
          onCancel={() => setAdding(null)}
        />
      ) : adding === "url" ? (
        <UrlLinkForm
          meetingId={meetingId}
          onLinked={() => setAdding(null)}
          onCancel={() => setAdding(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAdding("resource")} className={addButtonClass}>
            <Plus className="size-3.5" strokeWidth={2.25} />
            Link from Resources
          </button>
          <button type="button" onClick={() => setAdding("url")} className={addButtonClass}>
            <Link2 className="size-3.5" strokeWidth={2.25} />
            Link URL
          </button>
        </div>
      )}
    </div>
  );
}
