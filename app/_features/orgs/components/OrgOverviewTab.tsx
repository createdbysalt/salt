"use client";

import { useState } from "react";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { formatMoney } from "@/app/_lib/demo/orgs-demo-data";
import { linkedPeopleForOrg } from "@/app/_features/memory/components/linkableMemory";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  AccountRow,
  InlineEditableText,
  InlineSelect,
  RecordStatusControl,
  RELATIONSHIP_OPTIONS,
  RETAINER_SELECT_OPTIONS,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { SharedAccountFields } from "@/app/_features/memory/components/sharedAccountFields";

type OrgOverviewTabProps = {
  org: Org;
  account: SharedAccountFields;
  connections: Connection[];
  keyContactId: string;
  onKeyContactChange: (personId: string) => void;
};

export function OrgOverviewTab({
  org,
  account,
  connections,
  keyContactId,
  onKeyContactChange,
}: OrgOverviewTabProps) {
  const contacts = linkedPeopleForOrg(org.id, connections);

  const keyContactOptions = [
    { value: "", label: "Select key contact" },
    ...contacts.map((p) => ({ value: p.id, label: p.name })),
  ];

  const { recordStatus, onRecordStatusChange, relationship, onRelationshipChange } = account;

  const [website, setWebsite] = useState(org.website ?? "");
  const [industry, setIndustry] = useState(org.industry ?? "");
  const [revenueBand, setRevenueBand] = useState(org.revenueBand ?? "");
  const [retainerTier, setRetainerTier] = useState(org.retainerTier ?? "");
  const [mrr, setMrr] = useState(typeof org.mrrCents === "number" ? formatMoney(org.mrrCents) : "");

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt>
        <p className="text-sm leading-relaxed text-foreground/80">{org.summary}</p>
      </MemoryOverviewSection>

      {org.worthAttention && (
        <MemoryOverviewSection title="Worth attention" salt>
          <p className="text-sm leading-relaxed text-foreground/80">{org.worthAttention.reason}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Account">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <AccountRow label="Status">
            <RecordStatusControl value={recordStatus} onChange={onRecordStatusChange} />
          </AccountRow>
          <AccountRow label="Domain">
            <InlineEditableText value={website} onChange={setWebsite} placeholder="Add domain" />
          </AccountRow>
          <AccountRow label="Industry">
            <InlineEditableText value={industry} onChange={setIndustry} placeholder="Add industry" />
          </AccountRow>
          <AccountRow label="Revenue band">
            <InlineEditableText value={revenueBand} onChange={setRevenueBand} placeholder="Add revenue band" />
          </AccountRow>
          <AccountRow label="Relationship">
            <InlineSelect value={relationship} onChange={onRelationshipChange} options={RELATIONSHIP_OPTIONS} />
          </AccountRow>
          <AccountRow label="Retainer">
            <InlineSelect
              value={retainerTier}
              onChange={setRetainerTier}
              options={RETAINER_SELECT_OPTIONS}
              placeholder="Add retainer"
            />
          </AccountRow>
          <AccountRow label="MRR">
            <InlineEditableText value={mrr} onChange={setMrr} placeholder="Add MRR" />
          </AccountRow>
          <AccountRow label="Key contact">
            {contacts.length === 0 ? (
              <span className="text-sm text-muted-foreground/80 italic">No linked people</span>
            ) : (
              <InlineSelect
                value={keyContactId}
                onChange={onKeyContactChange}
                options={keyContactOptions}
                placeholder="Select key contact"
                popoverClassName="w-56"
              />
            )}
          </AccountRow>
        </dl>
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {org.tags.length ? (
            org.tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                {t}
              </span>
            ))
          ) : (
            <Empty>No tags yet.</Empty>
          )}
        </div>
      </MemoryOverviewSection>

      <TrustRow source={org.source} lastUpdatedAt={org.lastContactAt} entityName={org.name} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
