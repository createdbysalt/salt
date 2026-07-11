"use client";

import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { Loader2, Save, User } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from "@repo/ui";
import { toast } from "sonner";
import type { PlayerContextRow } from "../players/queries";
import { PLAYER_CAPABILITIES, type PlayerSlug } from "../players/capabilities";

interface PlayerContextEditorProps {
  workspaceId: string;
  playerSlug: PlayerSlug;
  context: PlayerContextRow | null;
  onSave: (data: {
    domain_knowledge: string | null;
    tone_preferences: string | null;
    workflow_preferences: string | null;
    context_doc: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function PlayerContextEditor({
  workspaceId,
  playerSlug,
  context,
  onSave,
}: PlayerContextEditorProps) {
  const player = PLAYER_CAPABILITIES[playerSlug];
  const [isPending, startTransition] = useTransition();

  const [domainKnowledge, setDomainKnowledge] = useState(
    context?.domain_knowledge ?? "",
  );
  const [tonePreferences, setTonePreferences] = useState(
    context?.tone_preferences ?? "",
  );
  const [workflowPreferences, setWorkflowPreferences] = useState(
    context?.workflow_preferences ?? "",
  );

  const hasChanges =
    domainKnowledge !== (context?.domain_knowledge ?? "") ||
    tonePreferences !== (context?.tone_preferences ?? "") ||
    workflowPreferences !== (context?.workflow_preferences ?? "");

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const contextDoc = [domainKnowledge, tonePreferences, workflowPreferences]
        .filter(Boolean)
        .join("\n\n");

      const result = await onSave({
        domain_knowledge: domainKnowledge || null,
        tone_preferences: tonePreferences || null,
        workflow_preferences: workflowPreferences || null,
        context_doc: contextDoc || null,
      });

      if (result.success) {
        toast.success("Player context saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }, [domainKnowledge, tonePreferences, workflowPreferences, onSave]);

  if (!player) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{player.name}</CardTitle>
            <CardDescription>{player.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Context you add here is injected into every playbook run for{" "}
          {player.name}. This is where Salt learns how you like{" "}
          {playerSlug === "billing"
            ? "billing handled"
            : playerSlug === "follow-up"
              ? "follow-ups sent"
              : playerSlug === "brief"
                ? "briefs prepared"
                : "things done"}
          .
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain Knowledge</Label>
            <Textarea
              id="domain"
              placeholder={`Industry terms, common entities, business rules specific to ${player.name.toLowerCase()} work...`}
              value={domainKnowledge}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDomainKnowledge(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              What does {player.name} need to know about your business?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone Preferences</Label>
            <Textarea
              id="tone"
              placeholder="How should messages sound? Formal, casual, direct..."
              value={tonePreferences}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTonePreferences(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              How should {player.name} communicate on your behalf?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow">Workflow Preferences</Label>
            <Textarea
              id="workflow"
              placeholder="Timing, channels, approval preferences..."
              value={workflowPreferences}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setWorkflowPreferences(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              When and how should {player.name} act?
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isPending ? "Saving..." : "Save Context"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PlayerContextListProps {
  workspaceId: string;
  contexts: Record<PlayerSlug, PlayerContextRow | null>;
  onSave: (
    playerSlug: PlayerSlug,
    data: {
      domain_knowledge: string | null;
      tone_preferences: string | null;
      workflow_preferences: string | null;
      context_doc: string | null;
    },
  ) => Promise<{ success: boolean; error?: string }>;
}

export function PlayerContextList({
  workspaceId,
  contexts,
  onSave,
}: PlayerContextListProps) {
  const players = Object.values(PLAYER_CAPABILITIES).filter(
    (p) => p.isSystem && p.slug !== "keeper",
  );

  return (
    <div className="space-y-6">
      {players.map((player) => (
        <PlayerContextEditor
          key={player.slug}
          workspaceId={workspaceId}
          playerSlug={player.slug}
          context={contexts[player.slug] ?? null}
          onSave={(data) => onSave(player.slug, data)}
        />
      ))}
    </div>
  );
}
