"use client";

import Link from "next/link";
import { useState } from "react";
import type { RelationshipType } from "@/app/_lib/demo/people-demo-data";
import {
  AccountRow,
  InlineEditableText,
  InlineSelect,
  RELATIONSHIP_OPTIONS,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import { WorkSaltProfileFieldsPanel } from "@/app/_features/work/components/WorkSaltProfileFieldsPanel";
import { relativeDays } from "@/app/_features/work/data";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import type {
  WorkDetailViewModel,
  WorkProfileFieldKey,
  WorkProfileFieldsView,
} from "@/app/_features/work/types";

type WorkOverviewTabProps = {
  work: WorkDetailViewModel;
  profileFields?: WorkProfileFieldsView | null;
};

export function WorkOverviewTab({ work, profileFields = null }: WorkOverviewTabProps) {
  const [relationship, setRelationship] = useState<RelationshipType>(
    work.org ? "Client" : "Unknown",
  );
  const [workStatus, setWorkStatus] = useState(work.status);
  const [projectType, setProjectType] = useState(work.projectType ?? "");
  const primaryContact = work.connections.find((connection) => connection.type === "person");
  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Renewing", label: "Renewing" },
    { value: "Stalled", label: "Stalled" },
    { value: "Wrapping", label: "Wrapping" },
  ] as const;

  function handleDiscussField(field: WorkProfileFieldKey) {
    openAskSalt(
      `On ${work.title}, help me review or change the ${field.replaceAll("_", " ")} Keeper filled in.`,
    );
  }

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt>
        <p className="text-sm leading-relaxed text-foreground/80">{work.summary}</p>
      </MemoryOverviewSection>

      <WorkSaltProfileFieldsPanel
        profileFields={profileFields}
        onCorrectField={handleDiscussField}
      />

      <MemoryOverviewSection title="Account">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <AccountRow label="Status">
            <InlineSelect value={workStatus} onChange={setWorkStatus} options={statusOptions} />
          </AccountRow>
          <AccountRow label="Progress">
            <span className="text-sm text-foreground/80 tabular-nums">{work.progress}%</span>
          </AccountRow>
          <AccountRow label="Organization">
            {work.org ? (
              <Link href={`/orgs/${work.org.id}`} className="text-sm font-medium text-flame hover:underline">
                {work.org.name}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground/80 italic">Add organization</span>
            )}
          </AccountRow>
          <AccountRow label="Project type">
            <InlineEditableText
              value={projectType}
              onChange={setProjectType}
              placeholder="Add project type"
            />
          </AccountRow>
          <AccountRow label="Relationship">
            <InlineSelect
              value={relationship}
              onChange={setRelationship}
              options={RELATIONSHIP_OPTIONS}
            />
          </AccountRow>
          <AccountRow label="Primary contact">
            {primaryContact ? (
              <Link
                href={`/people/${primaryContact.id}`}
                className="text-sm font-medium text-flame hover:underline"
              >
                {primaryContact.name}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground/80 italic">No linked people</span>
            )}
          </AccountRow>
          <AccountRow label="Last activity">
            <span className="text-sm text-foreground/80">{relativeDays(work.lastActivityAt)}</span>
          </AccountRow>
          <AccountRow label="Created">
            <span className="text-sm text-foreground/80">
              {work.createdAt ? relativeDays(work.createdAt) : "—"}
            </span>
          </AccountRow>
        </dl>
      </MemoryOverviewSection>

      {work.description ? (
        <MemoryOverviewSection title="Description">
          <p className="text-sm leading-relaxed text-foreground/80">{work.description}</p>
        </MemoryOverviewSection>
      ) : null}

      <MemoryOverviewSection title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {work.tags.length ? (
            work.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                {tag}
              </span>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          )}
        </div>
      </MemoryOverviewSection>

      <TrustRow source={work.source} lastUpdatedAt={work.lastActivityAt} entityName={work.title} />
    </div>
  );
}
