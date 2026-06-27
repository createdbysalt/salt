"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { linkedPeopleForOrg } from "@/app/_features/memory/components/linkableMemory";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  AccountRow,
  InlineEditableText,
  InlineSelect,
  InlineDatePicker,
  RecordStatusControl,
  RELATIONSHIP_OPTIONS,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { CollapsibleAddress } from "@/app/_features/memory/components/CollapsibleAddress";
import { LifecycleTimeline } from "@/app/_features/memory/components/LifecycleTimeline";
import { BillingMetricsSection, type BillingMetrics } from "@/app/_features/memory/components/BillingMetricsSection";
import { PersonSearchCombobox } from "@/app/_features/memory/components/PersonSearchCombobox";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { CapabilityReadinessStrip } from "@/app/_features/memory/components/CapabilityReadinessStrip";
import { getEntityReadiness } from "@/app/_features/memory/capabilities/readiness";
import type { SharedAccountFields } from "@/app/_features/memory/components/sharedAccountFields";
import {
  correctOrgProfileField,
  updateOrgAddress,
  updateOrgName,
  updateOrgLastContact,
  type OrgAddressField,
} from "@/app/_features/orgs/actions/profile-fields";
import { orgDisplayToStatus } from "@/app/_features/orgs/utils/relationship-display";
import type { OrgProfileFieldKey, OrgProfileFieldsView } from "@/app/_features/orgs/types";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import { dateInputToTimestamp, toDateInputValue } from "@/app/_features/memory/utils/date-input";
import { OrgSaltProfileFieldsPanel } from "./OrgSaltProfileFieldsPanel";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import { orgProfileFieldLabel } from "@/app/_features/orgs/utils/activity";

type AddressData = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type OrgOverviewTabProps = {
  org: Org;
  orgId: string;
  profileFields?: OrgProfileFieldsView | null;
  address?: AddressData | null;
  taxId?: string | null;
  billingEmail?: string | null;
  billingMetrics?: BillingMetrics | null;
  lifecycleEvents?: LifecycleEventDisplay[];
  isDemoOrg?: boolean;
  account: SharedAccountFields;
  connections: Connection[];
  keyContactId: string;
  onKeyContactChange: (personId: string) => void;
  onNameChange?: (name: string) => void;
  onProfileFieldSaved?: () => void;
  recordUpdatedAt?: string | null;
};

export function OrgOverviewTab({
  org,
  orgId,
  profileFields = null,
  address: initialAddress = null,
  taxId: initialTaxId = null,
  billingEmail: initialBillingEmail = null,
  billingMetrics = null,
  lifecycleEvents = [],
  isDemoOrg = false,
  account,
  connections,
  keyContactId,
  onKeyContactChange,
  onNameChange,
  onProfileFieldSaved,
  recordUpdatedAt = null,
}: OrgOverviewTabProps) {
  const contacts = linkedPeopleForOrg(org.id, connections);
  const keyContact = contacts.find((p) => p.id === keyContactId);

  const { recordStatus, onRecordStatusChange, relationship, onRelationshipChange } = account;

  const [name, setName] = useState(org.name ?? "");
  const [website, setWebsite] = useState(org.website ?? "");
  const [industry, setIndustry] = useState(org.industry ?? "");
  const [address, setAddress] = useState<AddressData>({
    addressLine1: initialAddress?.addressLine1 ?? "",
    addressLine2: initialAddress?.addressLine2 ?? "",
    city: initialAddress?.city ?? "",
    state: initialAddress?.state ?? "",
    postalCode: initialAddress?.postalCode ?? "",
    country: initialAddress?.country ?? "",
  });
  const [taxId, setTaxId] = useState(initialTaxId ?? "");
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail ?? "");
  const [lastContactAt, setLastContactAt] = useState(toDateInputValue(org.lastContactAt));

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

  async function handleNameChange(nextName: string) {
    setName(nextName);
    if (nextName === org.name || !nextName.trim() || isDemoOrg) return;
    const result = await updateOrgName({ orgId, name: nextName });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onNameChange?.(nextName);
    onProfileFieldSaved?.();
  }

  async function handleKeyContactByName(personName: string) {
    const person = contacts.find((p) => p.name === personName);
    if (person) {
      onKeyContactChange(person.id);
      if (person.id !== keyContactId) {
        await saveField("key_contact", person.id);
      }
    }
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

  async function handleBillingEmailChange(next: string) {
    setBillingEmail(next);
    await saveField("billing_email", next);
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

  async function handleAddressChange(field: keyof AddressData, value: string) {
    if (isDemoOrg) return;
    setAddress((prev) => ({ ...prev, [field]: value }));
    const result = await updateOrgAddress({
      orgId,
      field: field as OrgAddressField,
      value,
    });
    if (!result.ok) {
      toast.error(result.message);
    }
  }

  async function handleTaxIdChange(value: string) {
    if (isDemoOrg) return;
    setTaxId(value);
    const result = await updateOrgAddress({
      orgId,
      field: "taxId",
      value,
    });
    if (!result.ok) {
      toast.error(result.message);
    }
  }

  async function handleLastContactChange(value: string | null) {
    setLastContactAt(value);
    if (isDemoOrg) return;

    const result = await updateOrgLastContact({
      orgId,
      lastContactAt: dateInputToTimestamp(value),
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onProfileFieldSaved?.();
  }

  function handleDiscussField(field: OrgProfileFieldKey) {
    openAskSalt(
      `On ${org.name}'s profile, help me review or change the ${orgProfileFieldLabel(field)} Keeper filled in.`,
    );
  }

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt variant="heading">
        <p className="text-sm leading-relaxed text-foreground/80">{org.summary}</p>
      </MemoryOverviewSection>

      <OrgSaltProfileFieldsPanel profileFields={profileFields} onCorrectField={handleDiscussField} />

      {org.worthAttention && (
        <MemoryOverviewSection title="Worth attention" salt variant="heading">
          <p className="text-sm leading-relaxed text-foreground/80">{org.worthAttention.reason}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Details" variant="heading">
        <CapabilityReadinessStrip
          readiness={getEntityReadiness("org", {
            name,
            billingEmail,
            primaryContact: keyContact,
            taxId,
            ...address,
          })}
        />
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Identity
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <AccountRow label="Name">
            <InlineEditableText value={name} onChange={handleNameChange} placeholder="Add name" />
          </AccountRow>
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
          <AccountRow label="Key contact">
            <PersonSearchCombobox
              value={keyContact?.name ?? ""}
              onChange={handleKeyContactByName}
              placeholder="Search people..."
              inline
            />
          </AccountRow>
          <AccountRow label="Last contact">
            <InlineDatePicker
              value={lastContactAt}
              onChange={handleLastContactChange}
              placeholder="Add last contact"
            />
          </AccountRow>
        </dl>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Billing
          </p>
          <dl className="mb-4 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <AccountRow label="Billing email">
              <InlineEditableText
                value={billingEmail}
                onChange={handleBillingEmailChange}
                placeholder="Add billing email"
              />
            </AccountRow>
          </dl>
          <CollapsibleAddress
            address={address}
            onChange={handleAddressChange}
            taxId={taxId}
            onTaxIdChange={handleTaxIdChange}
            showTaxId
          />
        </div>
      </MemoryOverviewSection>

      <BillingMetricsSection metrics={billingMetrics} />

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

      {lifecycleEvents.length > 0 && <LifecycleTimeline events={lifecycleEvents} />}

      <TrustRow
        source={org.source}
        lastUpdatedAt={recordUpdatedAt ?? org.lastContactAt}
        entityName={org.name}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
