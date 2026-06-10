"use client";

import { useState } from "react";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import { formatMoney } from "@/app/_lib/demo/people-demo-data";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
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

type PersonOverviewTabProps = {
  person: Person;
  account: SharedAccountFields;
  organization: string;
  onOrganizationChange: (organization: string) => void;
};

export function PersonOverviewTab({
  person,
  account,
  organization,
  onOrganizationChange,
}: PersonOverviewTabProps) {
  const { recordStatus, onRecordStatusChange, relationship, onRelationshipChange } = account;

  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [retainerTier, setRetainerTier] = useState(person.retainerTier ?? "");
  const [mrr, setMrr] = useState(typeof person.mrrCents === "number" ? formatMoney(person.mrrCents) : "");

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt>
        <p className="text-sm leading-relaxed text-foreground/80">{person.summary}</p>
      </MemoryOverviewSection>

      {person.worthAttention && (
        <MemoryOverviewSection title="Worth attention" salt>
          <p className="text-sm leading-relaxed text-foreground/80">{person.worthAttention.reason}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Account">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <AccountRow label="Status">
            <RecordStatusControl value={recordStatus} onChange={onRecordStatusChange} />
          </AccountRow>
          <AccountRow label="Email">
            <InlineEditableText value={email} onChange={setEmail} placeholder="Add email" />
          </AccountRow>
          <AccountRow label="Phone">
            <InlineEditableText value={phone} onChange={setPhone} placeholder="Add phone" />
          </AccountRow>
          <AccountRow label="Organization">
            <InlineEditableText
              value={organization}
              onChange={onOrganizationChange}
              placeholder="Add organization"
              linkHref={person.org ? "/orgs" : undefined}
            />
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
        </dl>
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {person.tags.length ? (
            person.tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                {t}
              </span>
            ))
          ) : (
            <Empty>No tags yet.</Empty>
          )}
        </div>
      </MemoryOverviewSection>

      <TrustRow source={person.source} lastUpdatedAt={person.lastContactAt} entityName={person.name} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
