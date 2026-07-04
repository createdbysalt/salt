"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import {
  correctPersonProfileField,
  updatePersonDetailField,
  updatePersonAddress,
  updatePersonName,
  updatePersonLastContact,
  type PersonAddressField,
  type PersonDetailField,
} from "@/app/_features/people/actions/profile-fields";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import {
  AccountRow,
  InlineEditableText,
  InlineEditablePhone,
  InlineSelect,
  InlineDatePicker,
  RecordStatusControl,
  RELATIONSHIP_OPTIONS,
  timezoneSelectOptions,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { CollapsibleAddress } from "@/app/_features/memory/components/CollapsibleAddress";
import { BillingMetricsSection, type BillingMetrics } from "@/app/_features/memory/components/BillingMetricsSection";
import { OrgSearchCombobox } from "@/app/_features/memory/components/OrgSearchCombobox";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { CapabilityReadinessStrip } from "@/app/_features/memory/components/CapabilityReadinessStrip";
import { getEntityReadiness } from "@/app/_features/memory/capabilities/readiness";
import type { SharedAccountFields } from "@/app/_features/memory/components/sharedAccountFields";
import { dateInputToTimestamp, toDateInputValue } from "@/app/_features/memory/utils/date-input";
import { TagEditor } from "@/app/_features/memory/components/TagEditor";
import { validateRecordName } from "@/app/_features/memory/utils/record-name";

type AddressData = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type PersonOverviewTabProps = {
  person: Person;
  personId: string;
  address?: AddressData | null;
  billingEmail?: string | null;
  timezone?: string | null;
  billingMetrics?: BillingMetrics | null;
  account: SharedAccountFields;
  organization: string;
  onOrganizationChange: (organization: string) => void;
  onNameChange?: (name: string) => void;
  onProfileFieldSaved?: () => void;
  isDemoPerson?: boolean;
  recordUpdatedAt?: string | null;
};

export function PersonOverviewTab({
  person,
  personId,
  address: initialAddress = null,
  billingEmail: initialBillingEmail = null,
  timezone: initialTimezone = null,
  billingMetrics = null,
  account,
  organization,
  onOrganizationChange,
  onNameChange,
  onProfileFieldSaved,
  isDemoPerson = false,
  recordUpdatedAt = null,
}: PersonOverviewTabProps) {
  const { recordStatus, onRecordStatusChange, relationship, onRelationshipChange } = account;

  const [name, setName] = useState(person.name ?? "");
  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail ?? "");
  const [timezone, setTimezone] = useState(initialTimezone ?? "");
  const [title, setTitle] = useState(person.role ?? "");
  const [lastContactAt, setLastContactAt] = useState(toDateInputValue(person.lastContactAt));
  const [address, setAddress] = useState<AddressData>({
    addressLine1: initialAddress?.addressLine1 ?? "",
    addressLine2: initialAddress?.addressLine2 ?? "",
    city: initialAddress?.city ?? "",
    state: initialAddress?.state ?? "",
    postalCode: initialAddress?.postalCode ?? "",
    country: initialAddress?.country ?? "",
  });

  const [relationshipOpen, setRelationshipOpen] = useState(false);

  useEffect(() => {
    const handleChangeRelationship = () => setRelationshipOpen(true);
    window.addEventListener("person:change-relationship", handleChangeRelationship);
    return () => window.removeEventListener("person:change-relationship", handleChangeRelationship);
  }, []);

  async function saveProfileField(field: "relationship_type" | "title" | "org_link", value: string) {
    const result = await correctPersonProfileField({ personId, field, value });
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    onProfileFieldSaved?.();
    return true;
  }

  async function handleNameChange(nextName: string) {
    setName(nextName);
    if (nextName === person.name) return;
    const validated = validateRecordName(nextName);
    if (!validated.ok) {
      toast.error(validated.message);
      setName(person.name ?? "");
      return;
    }
    const result = await updatePersonName({ personId, name: validated.name });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onNameChange?.(nextName);
    onProfileFieldSaved?.();
  }

  async function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    if (nextTitle === (person.role ?? "")) return;
    await saveProfileField("title", nextTitle);
  }

  async function handleDetailFieldChange(field: PersonDetailField, value: string) {
    if (field === "email") setEmail(value);
    if (field === "phone") setPhone(value);
    if (field === "billingEmail") setBillingEmail(value);
    if (field === "timezone") setTimezone(value);

    const result = await updatePersonDetailField({ personId, field, value });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onProfileFieldSaved?.();
  }

  async function handleOrganizationChange(nextOrganization: string) {
    onOrganizationChange(nextOrganization);
    if (nextOrganization === organization) return;
    await saveProfileField("org_link", nextOrganization);
  }

  async function handleRelationshipChange(nextRelationship: typeof relationship) {
    onRelationshipChange(nextRelationship);
    await saveProfileField("relationship_type", nextRelationship);
  }

  async function handleAddressChange(field: keyof AddressData, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    const result = await updatePersonAddress({
      personId,
      field: field as PersonAddressField,
      value,
    });
    if (!result.ok) {
      toast.error(result.message);
    }
  }

  async function handleLastContactChange(value: string | null) {
    setLastContactAt(value);
    if (isDemoPerson) return;

    const result = await updatePersonLastContact({
      personId,
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
        <p className="text-sm leading-relaxed text-foreground/80">{person.summary}</p>
      </MemoryOverviewSection>

      {person.worthAttention && (
        <MemoryOverviewSection title="Worth attention" salt variant="heading">
          <p className="text-sm leading-relaxed text-foreground/80">{person.worthAttention.reason}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Details" variant="heading">
        <CapabilityReadinessStrip
          readiness={getEntityReadiness("person", {
            name,
            email,
            billingEmail,
            timezone,
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
          <AccountRow label="Email">
            <InlineEditableText
              value={email}
              onChange={(value) => handleDetailFieldChange("email", value)}
              placeholder="Add email"
            />
          </AccountRow>
          <AccountRow label="Phone">
            <InlineEditablePhone
              value={phone}
              onChange={(value) => handleDetailFieldChange("phone", value)}
              placeholder="+1 (555) 123-4567"
            />
          </AccountRow>
          <AccountRow label="Billing email">
            <InlineEditableText
              value={billingEmail}
              onChange={(value) => handleDetailFieldChange("billingEmail", value)}
              placeholder="Add billing email"
            />
          </AccountRow>
          <AccountRow label="Timezone">
            <InlineSelect
              value={timezone}
              onChange={(value) => handleDetailFieldChange("timezone", value)}
              options={timezoneSelectOptions(timezone)}
              placeholder="Select timezone"
              searchPlaceholder="Search timezones…"
            />
          </AccountRow>
          <AccountRow label="Job title">
            <InlineEditableText value={title} onChange={handleTitleChange} placeholder="Add job title" />
          </AccountRow>
          <AccountRow label="Organization">
            <OrgSearchCombobox
              value={organization}
              onChange={handleOrganizationChange}
              placeholder="Search organizations..."
              inline
            />
          </AccountRow>
          <AccountRow label="Relationship" id="person-relationship">
            <InlineSelect
              value={relationship}
              onChange={handleRelationshipChange}
              options={RELATIONSHIP_OPTIONS}
              open={relationshipOpen}
              onOpenChange={setRelationshipOpen}
            />
          </AccountRow>
          <AccountRow label="Last contact">
            <InlineDatePicker
              value={lastContactAt}
              onChange={handleLastContactChange}
              placeholder="Add last contact"
            />
          </AccountRow>
          <AccountRow label="Address">
            <CollapsibleAddress
              embedded
              address={address}
              onChange={handleAddressChange}
            />
          </AccountRow>
        </dl>
      </MemoryOverviewSection>

      <BillingMetricsSection metrics={billingMetrics} />

      <MemoryOverviewSection title="Tags" variant="heading">
        <TagEditor
          entityType="person"
          entityId={personId}
          scope="person"
          disabled={isDemoPerson}
        />
      </MemoryOverviewSection>

      <TrustRow
        source={person.source}
        lastUpdatedAt={recordUpdatedAt ?? person.lastContactAt}
        entityName={person.name}
        entityType="person"
        entityId={person.id}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
