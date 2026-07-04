"use client";

import { useEffect, useRef, useState } from "react";
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
  ORG_RELATIONSHIP_OPTIONS,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { CollapsibleAddress } from "@/app/_features/memory/components/CollapsibleAddress";
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
import type { OrgProfileFieldKey } from "@/app/_features/orgs/types";
import { dateInputToTimestamp, toDateInputValue } from "@/app/_features/memory/utils/date-input";
import { TagEditor } from "@/app/_features/memory/components/TagEditor";
import { validateRecordName } from "@/app/_features/memory/utils/record-name";
import { IndustrySelect } from "@/app/_features/memory/components/IndustrySelect";
import {
  formatIndustry,
  isValidIndustryParent,
  type IndustryParent,
} from "@/app/_features/memory/taxonomy/registry";

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
  industryParent?: string | null;
  industryChild?: string | null;
  address?: AddressData | null;
  taxId?: string | null;
  billingEmail?: string | null;
  billingMetrics?: BillingMetrics | null;
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
  industryParent: initialIndustryParent = null,
  industryChild: initialIndustryChild = null,
  address: initialAddress = null,
  taxId: initialTaxId = null,
  billingEmail: initialBillingEmail = null,
  billingMetrics = null,
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
  const [industryParentValue, setIndustryParentValue] = useState<IndustryParent | null>(
    initialIndustryParent && isValidIndustryParent(initialIndustryParent)
      ? initialIndustryParent
      : null,
  );
  const [industryChildValue, setIndustryChildValue] = useState<string | null>(
    initialIndustryChild,
  );
  // IndustrySelect fires onParentChange then onChildChange in the same tick —
  // the ref carries the pending parent into the single combined save.
  const pendingIndustryParent = useRef<IndustryParent | null>(industryParentValue);
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

  const [keyContactOpen, setKeyContactOpen] = useState(false);

  useEffect(() => {
    const handleAddContact = () => setKeyContactOpen(true);
    window.addEventListener("org:add-contact", handleAddContact);
    return () => window.removeEventListener("org:add-contact", handleAddContact);
  }, []);

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
    if (nextName === org.name || isDemoOrg) return;
    const validated = validateRecordName(nextName);
    if (!validated.ok) {
      toast.error(validated.message);
      setName(org.name ?? "");
      return;
    }
    const result = await updateOrgName({ orgId, name: validated.name });
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

  async function handleIndustryTaxonomyChange(
    parent: IndustryParent | null,
    child: string | null,
  ) {
    setIndustryParentValue(parent);
    setIndustryChildValue(child);
    if (isDemoOrg) return;
    const parentSaved = await saveField("industry_parent", parent ?? "");
    if (!parentSaved) return;
    await saveField("industry_child", child ?? "");
    // Keep the legacy free-text industry column in sync for directory display
    // until the Keeper backfill retires it as a write target.
    const label = formatIndustry(parent, child);
    await saveField("industry", parent ? label : "");
  }

  async function handleBillingEmailChange(next: string) {
    setBillingEmail(next);
    await saveField("billing_email", next);
  }

  async function handleRelationshipChange(next: typeof relationship) {
    onRelationshipChange(next);
    await saveField("relationship_status", next);
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

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt variant="heading">
        <p className="text-sm leading-relaxed text-foreground/80">{org.summary}</p>
      </MemoryOverviewSection>

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

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <AccountRow label="Name">
            <InlineEditableText value={name} onChange={handleNameChange} placeholder="Add name" />
          </AccountRow>
          <AccountRow label="Status">
            <RecordStatusControl value={recordStatus} onChange={onRecordStatusChange} />
          </AccountRow>
          <AccountRow label="Website">
            <InlineEditableText value={website} onChange={handleWebsiteChange} placeholder="Add website" />
          </AccountRow>
          <AccountRow label="Industry">
            <IndustrySelect
              parentValue={industryParentValue}
              childValue={industryChildValue}
              onParentChange={(parent) => {
                pendingIndustryParent.current = parent;
              }}
              onChildChange={(child) => {
                void handleIndustryTaxonomyChange(pendingIndustryParent.current, child);
              }}
              placeholder="Add industry"
            />
          </AccountRow>
          <AccountRow label="Relationship">
            <InlineSelect value={relationship} onChange={handleRelationshipChange} options={ORG_RELATIONSHIP_OPTIONS} />
          </AccountRow>
          <AccountRow label="Key contact" id="org-contacts">
            <PersonSearchCombobox
              value={keyContact?.name ?? ""}
              onChange={handleKeyContactByName}
              placeholder="Search people..."
              inline
              open={keyContactOpen}
              onOpenChange={setKeyContactOpen}
            />
          </AccountRow>
          <AccountRow label="Last contact">
            <InlineDatePicker
              value={lastContactAt}
              onChange={handleLastContactChange}
              placeholder="Add last contact"
            />
          </AccountRow>
          <AccountRow label="Billing email">
            <InlineEditableText
              value={billingEmail}
              onChange={handleBillingEmailChange}
              placeholder="Add billing email"
            />
          </AccountRow>
          <AccountRow label="Address">
            <CollapsibleAddress
              embedded
              address={address}
              onChange={handleAddressChange}
              taxId={taxId}
              onTaxIdChange={handleTaxIdChange}
              showTaxId
            />
          </AccountRow>
        </dl>
      </MemoryOverviewSection>

      <BillingMetricsSection metrics={billingMetrics} />

      <MemoryOverviewSection title="Tags" variant="heading">
        <TagEditor
          entityType="org"
          entityId={orgId}
          scope="org"
          disabled={isDemoOrg}
        />
      </MemoryOverviewSection>

      <TrustRow
        source={org.source}
        lastUpdatedAt={recordUpdatedAt ?? org.lastContactAt}
        entityName={org.name}
        entityType="org"
        entityId={org.id}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
