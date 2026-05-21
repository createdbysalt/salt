"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  MOCK_ACTIONS,
  MOCK_WORTH_REACHING_OUT,
  getMockPlayer,
  type MockOrganization,
  type MockPerson,
  type MockProject,
} from "@/app/_lib/demo";
import { CollapsibleSection } from "@/app/_features/relationships/components/CollapsibleSection";
import { InlineEditField } from "../../inline/InlineEditField";
import { CollapsibleBlock } from "../CollapsibleBlock";
import { PersonDetailDetails } from "../PersonDetailDetails";
import { ConnectionWorkRow } from "../connection-rows";
import { getPersonSummary, openAskSalt } from "../utils";

export function PersonOverviewTab({
  person,
  personId,
  projects,
  organization,
  organizations,
  onUpdatePerson,
}: {
  person: MockPerson;
  personId: string;
  projects: MockProject[];
  organization: MockOrganization | undefined;
  organizations: MockOrganization[];
  onUpdatePerson: (patch: Partial<MockPerson>) => void;
}) {
  const summary = getPersonSummary(person);
  const pendingActions = MOCK_ACTIONS.filter(
    (a) => a.relatedEntityId === personId && a.type !== "invoice_draft"
  );
  const queueItem = MOCK_WORTH_REACHING_OUT.find((item) => item.personId === personId);

  return (
    <div>
      <div className="mb-6 max-w-2xl">
        <InlineEditField
          value={summary}
          onSave={(value) => onUpdatePerson({ aiSummary: value || null })}
          placeholder="Add a short summary…"
          multiline
          displayClassName="block text-sm leading-relaxed text-muted-foreground"
          inputClassName="text-sm"
        />
      </div>

      {queueItem ? (
        <div className="mb-6 max-w-2xl rounded-lg border border-border/80 bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            On Worth Attention
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            {queueItem.reason}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
              onClick={() =>
                openAskSalt(`Explain why ${person.name} is on Worth Attention.`)
              }
            >
              <Sparkles className="size-3" />
              Why this?
            </button>
            <Link
              href="/people"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View queue
            </Link>
          </div>
        </div>
      ) : null}

      {pendingActions.length > 0 ? (
        <CollapsibleBlock
          title="Pending"
          action={
            <Link
              href="/plays"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View in Plays
            </Link>
          }
        >
          <ul className="space-y-4">
            {pendingActions.slice(0, 2).map((action) => {
              const player = getMockPlayer(action.playerId);
              return (
                <li key={action.id} className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{action.title}</p>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        openAskSalt(
                          `Review this queued action before I approve it: ${action.title}`
                        )
                      }
                    >
                      Review
                    </button>
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {action.draftContent.slice(0, 160)}
                  </p>
                  {player ? (
                    <p className="text-xs text-muted-foreground">
                      Drafted by {player.name}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CollapsibleBlock>
      ) : null}

      <CollapsibleBlock title="Active work" defaultOpen>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active projects linked to this relationship yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => (
              <ConnectionWorkRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </CollapsibleBlock>

      <div className="border-t border-border">
        <CollapsibleSection title="Details" defaultOpen={false}>
          <PersonDetailDetails
            person={person}
            organization={organization}
            organizations={organizations}
            onUpdatePerson={onUpdatePerson}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
