"use client";

import * as React from "react";
import { ArrowRight, ClipboardList, FileText, Play } from "lucide-react";
import { Avatar, AvatarFallback, Card } from "@repo/ui";

/**
 * Play review artifacts rendered inside the Ask Salt thread.
 * Moved from AskSaltPanel during the Vercel chat UI migration.
 */

export type AskSaltArtifact =
  | {
      type: "knowledge";
      title: string;
      description: string;
    }
  | {
      type: "player";
      player: AskSaltArtifactPlayer;
      description: string;
    }
  | {
      type: "play";
      title: string;
      description: string;
      steps: string[];
      player: AskSaltArtifactPlayer;
    }
  | {
      type: "queue";
      title: string;
      description: string;
    };

type AskSaltArtifactPlayer = {
  name: string;
  avatar: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function isAskSaltArtifact(value: unknown): value is AskSaltArtifact {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "knowledge" || type === "player" || type === "play" || type === "queue";
}

export function extractSavedArtifacts(
  metadata: Record<string, unknown> | null | undefined,
): AskSaltArtifact[] {
  const artifacts = metadata?.artifacts;
  if (!Array.isArray(artifacts)) return [];
  return artifacts.filter(isAskSaltArtifact);
}

export function ArtifactCard({ artifact }: { artifact: AskSaltArtifact }) {
  if (artifact.type === "knowledge") {
    return (
      <Card className="p-3">
        <ArtifactHeader icon={FileText} label="Saved context" />
        <p className="mt-2 text-sm font-medium">{artifact.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
      </Card>
    );
  }

  if (artifact.type === "player") {
    const Icon = artifact.player.icon;
    return (
      <Card className="p-3">
        <ArtifactHeader icon={Icon} label="Assigned Player" />
        <div className="mt-3 flex items-start gap-3">
          <Avatar className="size-8">
            <AvatarFallback>{artifact.player.avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{artifact.player.name}</p>
            <p className="text-xs text-muted-foreground">{artifact.description}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (artifact.type === "play") {
    return (
      <Card className="p-3">
        <ArtifactHeader icon={Play} label="Play draft" />
        <p className="mt-2 text-sm font-medium">{artifact.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
        <div className="mt-3 space-y-1">
          {artifact.steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <ArtifactHeader icon={ClipboardList} label="Queue item" />
      <p className="mt-2 text-sm font-medium">{artifact.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
    </Card>
  );
}

function ArtifactHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <ArrowRight className="size-3 text-muted-foreground" />
    </div>
  );
}
