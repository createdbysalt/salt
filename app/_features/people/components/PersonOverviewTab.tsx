"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import { formatMoney } from "@/app/_lib/demo/people-demo-data";
import {
  correctPersonProfileField,
  updatePersonAddress,
  type PersonAddressField,
} from "@/app/_features/people/actions/profile-fields";
import { personDisplayToProfileRelationship } from "@/app/_features/people/utils/relationship-display";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import {
  AccountRow,
  InlineEditableText,
  InlineSelect,
  RecordStatusControl,
  RELATIONSHIP_OPTIONS,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { CollapsibleAddress } from "@/app/_features/memory/components/CollapsibleAddress";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { SharedAccountFields } from "@/app/_features/memory/components/sharedAccountFields";
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
  account: SharedAccountFields;
  organization: string;
  onOrganizationChange: (organization: string) => void;
  onProfileFieldSaved?: () => void;
};

export function PersonOverviewTab({
  person,
  personId,
  profileFields = null,
  address: initialAddress = null,
  account,
  organization,
  onOrganizationChange,
  onProfileFieldSaved,
}: PersonOverviewTabProps) {
  const { recordStatus, onRecordStatusChange, relationship, onRelationshipChange } = account;

  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [title, setTitle] = useState(person.role ?? "");
  const [address, setAddress] = useState<AddressData>({
    addressLine1: initialAddress?.addressLine1 ?? "",
    addressLine2: initialAddress?.addressLine2 ?? "",
    city: initialAddress?.city ?? "",
    state: initialAddress?.state ?? "",
    postalCode: initialAddress?.postalCode ?? "",
    country: initialAddress?.country ?? "",
  });
  const retainer = person.retainerLabel ?? person.retainerTier ?? "No active retainer";
  const mrr = typeof person.mrrCents === "number" ? formatMoney(person.mrrCents) : "—";

  async function saveProfileField(field: "relationship_type" | "title" | "org_link", value: string) {
    const result = await correctPersonProfileField({ personId, field, value });
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    onProfileFieldSaved?.();
    return true;
  }

  async function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    if (nextTitle === (person.role ?? "")) return;
    await saveProfileField("title", nextTitle);
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

  function handleDiscussField(field: PersonProfileFieldKey) {
    openAskSalt(
      `On ${person.name}'s profile, help me review or change the ${profileFieldLabel(field)} Keeper filled in.`,
    );
  }

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt>
        <p className="text-sm leading-relaxed text-foreground/80">{person.summary}</p>
      </MemoryOverviewSection>

      <SaltProfileFieldsPanel
        profileFields={profileFields}
        onCorrectField={handleDiscussField}
      />

      {person.worthAttention && (
        <MemoryOverviewSection title="Worth attention" salt>
          <p className="text-sm leading-relaxed text-foreground/80">{person.worthAttention.reason}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Details">
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
          <AccountRow label="Job title">
            <InlineEditableText value={title} onChange={handleTitleChange} placeholder="Add job title" />
          </AccountRow>
          <AccountRow label="Organization">
            <InlineEditableText
              value={organization}
              onChange={handleOrganizationChange}
              placeholder="Add organization"
              linkHref={person.org ? "/orgs" : undefined}
            />
          </AccountRow>
          <AccountRow label="Relationship">
            <InlineSelect value={relationship} onChange={handleRelationshipChange} options={RELATIONSHIP_OPTIONS} />
          </AccountRow>
          <AccountRow label="Retainer">
            <ReadOnlyDerivedValue empty={!person.retainerLabel && !person.retainerTier}>{retainer}</ReadOnlyDerivedValue>
          </AccountRow>
          <AccountRow label="MRR">
            <ReadOnlyDerivedValue empty={typeof person.mrrCents !== "number"}>{mrr}</ReadOnlyDerivedValue>
          </AccountRow>
        </dl>
        <div className="mt-4 pt-4 border-t border-border/50">
          <CollapsibleAddress address={address} onChange={handleAddressChange} />
        </div>
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

function ReadOnlyDerivedValue({
  children,
  empty = false,
}: {
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <span className={empty ? "text-muted-foreground/80" : "text-foreground"}>
      {children}
    </span>
  );
}
