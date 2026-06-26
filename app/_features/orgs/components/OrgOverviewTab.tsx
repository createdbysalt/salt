"use client";

import { useState } from "react";
import { toast } from "sonner";
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
} from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { SharedAccountFields } from "@/app/_features/memory/components/sharedAccountFields";
import { correctOrgProfileField } from "@/app/_features/orgs/actions/profile-fields";
import { orgDisplayToStatus } from "@/app/_features/orgs/utils/relationship-display";
import type { OrgProfileFieldsView } from "@/app/_features/orgs/types";
import { OrgSaltProfileFieldsPanel } from "./OrgSaltProfileFieldsPanel";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import { orgProfileFieldLabel } from "@/app/_features/orgs/utils/activity";
import type { OrgProfileFieldKey } from "@/app/_features/orgs/types";

type OrgOverviewTabProps = {
  org: Org;
  orgId: string;
  profileFields?: OrgProfileFieldsView | null;
  isDemoOrg?: boolean;
  account: SharedAccountFields;
  connections: Connection[];
  keyContactId: string;
  onKeyContactChange: (personId: string) => void;
  onProfileFieldSaved?: () => void;
};

export function OrgOverviewTab({
  org,
  orgId,
  profileFields = null,
  isDemoOrg = false,
  account,
  connections,
  keyContactId,
  onKeyContactChange,
  onProfileFieldSaved,
}: OrgOverviewTabProps) {
  const contacts = linkedPeopleForOrg(org.id, connections);

  const keyContactOptions = [
    { value: "", label: "Select key contact" },
    ...contacts.map((p) => ({ value: p.id, label: p.name })),
  ];

  const { recordStatus, onRecordStatusChange, relationship, onRelationshipChange } = account;

  const [website, setWebsite] = useState(org.website ?? "");
  const [industry, setIndustry] = useState(org.industry ?? "");
  const retainer = org.retainerTier ?? org.metrics.activeWork > 0 ? "Active retainer" : "No active retainer";
  const mrr = typeof org.mrrCents === "number" ? formatMoney(org.mrrCents) : "—";

  async function saveField(field: OrgProfileFieldKey, value: string) {
    if (isDemoOrg) return true;
    const result = await correctOrgProfileField({ orgId, field, value });
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    onProfileFieldSaved?.();
    return true;
  }

  async function handleWebsiteChange(next: string) {
    setWebsite(next);
    if (next === (org.website ?? "")) return;
    await saveField("website", next);
  }

  async function handleIndustryChange(next: string) {
    setIndustry(next);
    if (next === (org.industry ?? "")) return;
    await saveField("industry", next);
  }

  async function handleRelationshipChange(next: typeof relationship) {
    onRelationshipChange(next);
    const status = orgDisplayToStatus(next);
    if (!status) {
      toast.error("That relationship value is not supported yet.");
      return;
    }
    await saveField("relationship_status", status);
  }

  async function handleKeyContactChange(nextPersonId: string) {
    onKeyContactChange(nextPersonId);
    if (!nextPersonId || nextPersonId === keyContactId) return;
    await saveField("key_contact", nextPersonId);
  }

  function handleDiscussField(field: OrgProfileFieldKey) {
    openAskSalt(
      `On ${org.name}'s profile, help me review or change the ${orgProfileFieldLabel(field)} Keeper filled in.`,
    );
  }

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt>
        <p className="text-sm leading-relaxed text-foreground/80">{org.summary}</p>
      </MemoryOverviewSection>

      <OrgSaltProfileFieldsPanel profileFields={profileFields} onCorrectField={handleDiscussField} />

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
            <InlineEditableText value={website} onChange={handleWebsiteChange} placeholder="Add domain" />
          </AccountRow>
          <AccountRow label="Industry">
            <InlineEditableText value={industry} onChange={handleIndustryChange} placeholder="Add industry" />
          </AccountRow>
          <AccountRow label="Relationship">
            <InlineSelect value={relationship} onChange={handleRelationshipChange} options={RELATIONSHIP_OPTIONS} />
          </AccountRow>
          <AccountRow label="Retainer">
            <span className="text-sm text-foreground/80">{retainer}</span>
          </AccountRow>
          <AccountRow label="MRR">
            <span className="text-sm text-foreground/80 tabular-nums">{mrr}</span>
          </AccountRow>
          <AccountRow label="Key contact">
            {contacts.length === 0 ? (
              <span className="text-sm text-muted-foreground/80 italic">No linked people</span>
            ) : (
              <InlineSelect
                value={keyContactId}
                onChange={handleKeyContactChange}
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
