"use client";

import { useState } from "react";
import {
  ExternalLink,
  FileText,
  Figma,
  Github,
  Link2,
  Plus,
  Video,
} from "lucide-react";
import { Button } from "@repo/ui";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import type { MeetingSource } from "../queries";
import { LinkFileSheet } from "./LinkFileSheet";

type ConnectedFilesSectionProps = {
  meetingId: string;
  sources: MeetingSource[];
};

const PROVIDER_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  "google-drive": { icon: FileText, label: "Google Drive", color: "text-blue-500" },
  figma: { icon: Figma, label: "Figma", color: "text-purple-500" },
  notion: { icon: FileText, label: "Notion", color: "text-foreground" },
  loom: { icon: Video, label: "Loom", color: "text-purple-600" },
  miro: { icon: FileText, label: "Miro", color: "text-yellow-500" },
  linear: { icon: FileText, label: "Linear", color: "text-indigo-500" },
  github: { icon: Github, label: "GitHub", color: "text-foreground" },
  slack: { icon: FileText, label: "Slack", color: "text-pink-500" },
  dropbox: { icon: FileText, label: "Dropbox", color: "text-blue-600" },
  other: { icon: ExternalLink, label: "Link", color: "text-muted-foreground" },
};

function getProviderConfig(provider: string) {
  return PROVIDER_CONFIG[provider] ?? PROVIDER_CONFIG.other;
}

function getSafeSourceUrl(sourceUrl: string | undefined): string | null {
  return safeHttpUrl(sourceUrl);
}

function getDisplayName(source: MeetingSource): string {
  if (source.displayName) return source.displayName;

  const safeUrl = getSafeSourceUrl(source.sourceUrl);
  if (safeUrl) {
    try {
      const url = new URL(safeUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        const last = pathParts[pathParts.length - 1];
        return decodeURIComponent(last).replace(/[-_]/g, " ");
      }
      return url.hostname;
    } catch {
      return "Linked file";
    }
  }

  return "Linked file";
}

export function ConnectedFilesSection({ meetingId, sources }: ConnectedFilesSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const linkedFiles = sources.filter((s) => s.kind === "linked_file");
  const hasFiles = linkedFiles.length > 0;

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="size-4" strokeWidth={2} />
            Connected Files
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setSheetOpen(true)}
          >
            <Plus className="size-3.5" />
            Link
          </Button>
        </div>

        {hasFiles ? (
          <ul className="space-y-2">
            {linkedFiles.map((source) => {
              const config = getProviderConfig(source.provider);
              const Icon = config.icon;
              const name = getDisplayName(source);
              const safeUrl = getSafeSourceUrl(source.sourceUrl);

              return (
                <li key={source.id}>
                  {safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition hover:bg-muted/50"
                    >
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="size-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground group-hover:underline">
                          {name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {config.label}
                        </p>
                      </div>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </a>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="size-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No files linked yet
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0 text-xs"
              onClick={() => setSheetOpen(true)}
            >
              Link a document, design, or recording
            </Button>
          </div>
        )}
      </div>

      <LinkFileSheet
        meetingId={meetingId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
