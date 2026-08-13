"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  FileText,
  Figma,
  Github,
  Plus,
  Video,
} from "lucide-react";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { ConnectionNode } from "@/app/_features/connections/types";
import { AttachedResourcesSection } from "@/app/_features/resources/components/AttachedResourcesSection";
import { AddResourcePanel } from "@/app/_features/resources/components/AddResourcePanel";
import type { MeetingSource } from "../queries";
import { linkUrlToMeeting } from "../actions";

type MeetingNotesSectionProps = {
  meetingId: string;
  resourceConnections: ConnectionNode[];
  linkedFileSources: MeetingSource[];
  existingConnections: Connection[];
  onLinkResource: (connection: Connection) => void;
  onUnlinkResource: (node: ConnectionNode) => void;
};

const addButtonClass =
  "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground";

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

export function MeetingNotesSection({
  meetingId,
  resourceConnections,
  linkedFileSources,
  existingConnections,
  onLinkResource,
  onUnlinkResource,
}: MeetingNotesSectionProps) {
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const openPicker = () => setAdding(true);
    window.addEventListener("meeting:link-resource", openPicker);
    return () => window.removeEventListener("meeting:link-resource", openPicker);
  }, []);

  return (
    <div className="space-y-4">
      {resourceConnections.length > 0 && (
        <AttachedResourcesSection
          entityType="meeting"
          entityId={meetingId}
          entityName="this meeting"
          resources={resourceConnections}
          onUnlink={onUnlinkResource}
          hideAddAction
        />
      )}

      {linkedFileSources.length > 0 && (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/50 px-3">
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

      {adding ? (
        <AddResourcePanel
          recordKind="meeting"
          recordId={meetingId}
          linkedResourceIds={existingConnections
            .filter((c) => c.type === "resource")
            .map((c) => c.id)}
          label="Add resource"
          onCreateFromUrl={async ({ url, displayName }) => {
            const result = await linkUrlToMeeting({
              meetingId,
              url,
              displayName,
            });
            return result.ok ? { ok: true } : { ok: false, error: result.message };
          }}
          onLinkedExisting={(candidate) => {
            onLinkResource({
              id: candidate.id,
              name: candidate.name,
              type: candidate.type,
              subtitle: candidate.subtitle,
            } as Connection);
          }}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={addButtonClass}>
          <Plus className="size-3.5" strokeWidth={2.25} />
          Add resource
        </button>
      )}
    </div>
  );
}
