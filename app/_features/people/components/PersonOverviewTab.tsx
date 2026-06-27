"use client";

import { useState } from "react";
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
import { personDisplayToProfileRelationship } from "@/app/_features/people/utils/relationship-display";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
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
import { OrgSearchCombobox } from "@/app/_features/memory/components/OrgSearchCombobox";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { CapabilityReadinessStrip } from "@/app/_features/memory/components/CapabilityReadinessStrip";
import { getEntityReadiness } from "@/app/_features/memory/capabilities/readiness";
import type { SharedAccountFields } from "@/app/_features/memory/components/sharedAccountFields";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import { dateInputToTimestamp, toDateInputValue } from "@/app/_features/memory/utils/date-input";
import { SaltProfileFieldsPanel } from "@/app/_features/people/components/SaltProfileFieldsPanel";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import type {
  PersonProfileFieldKey,
  PersonProfileFieldsView,
} from "@/app/_features/plays/playbooks/profile/types";
import { profileFieldLabel } from "@/app/_features/people/utils/activity";

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
  profileFields?: PersonProfileFieldsView | null;
  address?: AddressData | null;
  billingEmail?: string | null;
  timezone?: string | null;
  billingMetrics?: BillingMetrics | null;
  lifecycleEvents?: LifecycleEventDisplay[];
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
  profileFields = null,
  address: initialAddress = null,
  billingEmail: initialBillingEmail = null,
  timezone: initialTimezone = null,
  billingMetrics = null,
  lifecycleEvents = [],
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
    if (nextName === person.name || !nextName.trim()) return;
    const result = await updatePersonName({ personId, name: nextName });
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
    const profileRelationship = personDisplayToProfileRelationship(nextRelationship);
    if (!profileRelationship) {
      toast.error("Keeper relationship rules do not support that value yet.");
      return;
    }
    await saveProfileField("relationship_type", profileRelationship);
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

  function handleDiscussField(field: PersonProfileFieldKey) {
    openAskSalt(
      `On ${person.name}'s profile, help me review or change the ${profileFieldLabel(field)} Keeper filled in.`,
    );
  }

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt variant="heading">
        <p className="text-sm leading-relaxed text-foreground/80">{person.summary}</p>
      </MemoryOverviewSection>

      <SaltProfileFieldsPanel profileFields={profileFields} onCorrectField={handleDiscussField} />

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
          <AccountRow label="Email">
            <InlineEditableText
              value={email}
              onChange={(value) => handleDetailFieldChange("email", value)}
              placeholder="Add email"
            />
          </AccountRow>
          <AccountRow label="Phone">
            <InlineEditableText
              value={phone}
              onChange={(value) => handleDetailFieldChange("phone", value)}
              placeholder="Add phone"
            />
          </AccountRow>
          <AccountRow label="Timezone">
            <InlineEditableText
              value={timezone}
              onChange={(value) => handleDetailFieldChange("timezone", value)}
              placeholder="Add timezone"
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
          <AccountRow label="Relationship">
            <InlineSelect value={relationship} onChange={handleRelationshipChange} options={RELATIONSHIP_OPTIONS} />
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
                onChange={(value) => handleDetailFieldChange("billingEmail", value)}
                placeholder="Add billing email"
              />
            </AccountRow>
          </dl>
          <CollapsibleAddress address={address} onChange={handleAddressChange} />
        </div>
      </MemoryOverviewSection>

      <BillingMetricsSection metrics={billingMetrics} />

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

      {lifecycleEvents.length > 0 && <LifecycleTimeline events={lifecycleEvents} />}

      <TrustRow
        source={person.source}
        lastUpdatedAt={recordUpdatedAt ?? person.lastContactAt}
        entityName={person.name}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
