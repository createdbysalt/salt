"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Lock,
  Briefcase,
  Pencil,
  ChevronDown,
  Sparkles,
  Target,
  ArrowRight,
  Package,
  TrendingUp,
  MessageSquare,
  DollarSign,
  Zap,
  Link2,
  FileBox,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import {
  AccountRow,
  InlineEditableText,
  InlineEditablePhone,
  InlineSelect,
  ReadOnlyDerivedValue,
  timezoneSelectOptions,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { formatPhoneForDisplay } from "@/app/_features/memory/utils/phone-format";
import { getVocabularyOptions } from "@/app/_features/memory/taxonomy/registry";
import {
  CollapsibleAddress,
  formatAddressSummary,
} from "@/app/_features/memory/components/CollapsibleAddress";
import type { MemoryAddressField } from "@/app/_features/memory/utils/address-fields";
import type { ProfileContextFacts } from "@/app/_features/plays/playbooks/records-engine/types";
import { MeWorkspaceDomains } from "../MeWorkspaceDomains";
import { updateOperatorIdentity, updateOperatorAddress } from "../../actions";
import {
  updateWorkspaceProfile,
  updateWorkspaceLegalAddress,
  createStudioService,
  updateStudioService,
  deleteStudioService,
  createServiceRelationship,
  deleteServiceRelationship,
  updateServiceRelationship,
  updateServiceDeliverables,
} from "@/app/_features/workspace-settings/actions";
import type { OperatorIdentity, OperatorBusiness, OperatorBusinessService, OperatorGoal, ICPSegment, ServiceRelationshipType } from "../../types";
import { ICPSegmentsSection } from "../ICPSegmentsSection";
import { GoalsSection } from "../GoalsSection";

type MeOverviewTabProps = {
  identity: OperatorIdentity;
  business: OperatorBusiness;
  contextFacts: ProfileContextFacts;
  icpSegments: ICPSegment[];
  goals: OperatorGoal[];
};

export function MeOverviewTab({ identity, business, contextFacts, icpSegments, goals }: MeOverviewTabProps) {
  return (
    <div className="space-y-10">
      <section>
        <SectionHeader>About You</SectionHeader>
        <div className="mt-4">
          <IdentitySection identity={identity} />
        </div>
      </section>

      <section>
        <SectionHeader>Business</SectionHeader>
        <div className="mt-4 space-y-6">
          <BusinessSection business={business} />
          <MeWorkspaceDomains initialFacts={contextFacts} />
          <ICPSegmentsSection segments={icpSegments} canEdit={business.canEdit} />
          <GoalsSection goals={goals} canEdit={business.canEdit} />
          <ServicesSection services={business.services} canEdit={business.canEdit} />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl tracking-tight text-foreground">
      {children}
    </h2>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

type EditableIdentityField =
  | "preferredName"
  | "fullName"
  | "gender"
  | "roleTitle"
  | "phone"
  | "timezone"
  | "workingHours"
  | "location"
  | "professionalCredentials";

// ─── Identity Section ───────────────────────────────────────────────────────
function IdentitySection({ identity }: { identity: OperatorIdentity }) {
  const router = useRouter();
  const [localIdentity, setLocalIdentity] = useState(identity);
  const [localAddress, setLocalAddress] = useState(identity.address);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalIdentity(identity);
  }, [identity]);

  useEffect(() => {
    setLocalAddress(identity.address);
  }, [identity.address]);

  const saveField = (field: EditableIdentityField, value: string | null) => {
    const previous = localIdentity;
    setLocalIdentity((prev) => ({
      ...prev,
      [field]:
        field === "gender"
          ? (value as OperatorIdentity["gender"])
          : (value ?? ""),
    }));
    startTransition(async () => {
      const res = await updateOperatorIdentity(
        field === "gender"
          ? { gender: value }
          : { [field]: value },
      );
      if (!res.ok) {
        setLocalIdentity(previous);
        toast.error(res.message);
        return;
      }
      router.refresh();
    });
  };

  const handleAddressChange = (field: MemoryAddressField, value: string) => {
    const previous = localAddress;
    setLocalAddress((prev) => ({ ...prev, [field]: value }));
    startTransition(async () => {
      const res = await updateOperatorAddress({ field, value });
      if (!res.ok) {
        setLocalAddress(previous);
        toast.error(res.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <AccountRow label="Preferred name">
          <InlineEditableText
            value={localIdentity.preferredName}
            onChange={(v) => saveField("preferredName", v)}
            placeholder="What should Salt call you?"
          />
        </AccountRow>
        <AccountRow label="Full name">
          <InlineEditableText
            value={localIdentity.fullName}
            onChange={(v) => saveField("fullName", v)}
            placeholder="Your legal or display name"
          />
        </AccountRow>
        <AccountRow label="Gender">
          <InlineSelect
            value={localIdentity.gender ?? ""}
            onChange={(v) => saveField("gender", v || null)}
            options={GENDER_OPTIONS}
            placeholder="Not specified"
          />
        </AccountRow>
        <AccountRow label="Role / title">
          <InlineEditableText
            value={localIdentity.roleTitle}
            onChange={(v) => saveField("roleTitle", v)}
            placeholder="Founder, Designer, etc."
          />
        </AccountRow>
        <AccountRow label="Phone">
          <InlineEditablePhone
            value={localIdentity.phone}
            onChange={(v) => saveField("phone", v)}
            placeholder="+1 (555) 123-4567"
          />
        </AccountRow>
        <AccountRow label="Time zone">
          <InlineSelect
            value={localIdentity.timezone ?? ""}
            onChange={(v) => saveField("timezone", v || null)}
            options={timezoneSelectOptions(localIdentity.timezone)}
            placeholder="Select timezone"
            searchPlaceholder="Search timezones…"
          />
        </AccountRow>
        <AccountRow label="Working hours">
          <InlineEditableText
            value={localIdentity.workingHours}
            onChange={(v) => saveField("workingHours", v)}
            placeholder="9am–6pm ET"
          />
        </AccountRow>
        <AccountRow label="Location">
          <InlineEditableText
            value={localIdentity.location}
            onChange={(v) => saveField("location", v)}
            placeholder="City, State"
          />
        </AccountRow>
        <AccountRow label="Address">
          <CollapsibleAddress
            embedded
            address={localAddress}
            onChange={handleAddressChange}
          />
        </AccountRow>
        <AccountRow label="Credentials">
          <InlineEditableText
            value={localIdentity.professionalCredentials}
            onChange={(v) => saveField("professionalCredentials", v)}
            placeholder="CPA, PMP, etc."
          />
        </AccountRow>
        <AccountRow label="Email">
          <ReadOnlyDerivedValue empty={!localIdentity.email}>
            {localIdentity.email || "Not set"}
          </ReadOnlyDerivedValue>
        </AccountRow>
      </dl>

      {localIdentity.currentFocus && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Current focus</p>
          <p className="mt-1 text-sm text-foreground leading-snug">{localIdentity.currentFocus}</p>
        </div>
      )}

      {localIdentity.emailSignature && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Email signature</p>
          <pre className="mt-1 text-sm text-foreground font-sans whitespace-pre-wrap leading-snug">{localIdentity.emailSignature}</pre>
        </div>
      )}
    </div>
  );
}

const BUSINESS_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  ...getVocabularyOptions("business_type"),
];

// workspaces.default_currency is unconstrained TEXT — full ISO registry set, code labels.
const CURRENCY_OPTIONS = getVocabularyOptions("currency").map((opt) => ({
  value: opt.value,
  label: opt.value,
}));

const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "Select terms" },
  ...getVocabularyOptions("payment_terms"),
];

const BUSINESS_API_FIELD_MAP: Record<
  string,
  keyof Pick<
    OperatorBusiness,
    | "name"
    | "tagline"
    | "websiteUrl"
    | "industry"
    | "legalBusinessName"
    | "businessType"
    | "businessPhone"
    | "businessEmail"
    | "location"
    | "taxIdType"
    | "taxIdLast4"
    | "defaultCurrency"
    | "paymentTerms"
  >
> = {
  name: "name",
  tagline: "tagline",
  website_url: "websiteUrl",
  industry: "industry",
  legal_business_name: "legalBusinessName",
  business_type: "businessType",
  business_phone: "businessPhone",
  business_email: "businessEmail",
  location: "location",
  tax_id_type: "taxIdType",
  tax_id_last4: "taxIdLast4",
  default_currency: "defaultCurrency",
  payment_terms: "paymentTerms",
};

// ─── Business Section ───────────────────────────────────────────────────────
function BusinessSection({ business }: { business: OperatorBusiness }) {
  const router = useRouter();
  const [localBusiness, setLocalBusiness] = useState(business);
  const [localLegalAddress, setLocalLegalAddress] = useState(business.legalAddress);
  const { canEdit } = localBusiness;
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalBusiness(business);
  }, [business]);

  useEffect(() => {
    setLocalLegalAddress(business.legalAddress);
  }, [business.legalAddress]);

  const saveField = (field: string, value: string | null) => {
    if (!canEdit) return;
    const previous = localBusiness;
    const localKey = BUSINESS_API_FIELD_MAP[field];
    if (localKey) {
      setLocalBusiness((prev) => ({ ...prev, [localKey]: value || null }));
    }
    startTransition(async () => {
      const update: Record<string, string | null | undefined> = {};
      update[field] = value || null;
      const res = await updateWorkspaceProfile(update);
      if ("error" in res && res.error) {
        setLocalBusiness(previous);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleLegalAddressChange = (field: MemoryAddressField, value: string) => {
    if (!canEdit) return;
    const previous = localLegalAddress;
    setLocalLegalAddress((prev) => ({ ...prev, [field]: value }));
    startTransition(async () => {
      const res = await updateWorkspaceLegalAddress({ field, value });
      if ("error" in res && res.error) {
        setLocalLegalAddress(previous);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const EditableField = ({
    label,
    field,
    value,
    placeholder,
    kind = "text",
  }: {
    label: string;
    field: string;
    value: string | null;
    placeholder: string;
    kind?: "text" | "phone";
  }) => (
    <AccountRow label={label}>
      {canEdit ? (
        kind === "phone" ? (
          <InlineEditablePhone
            value={value ?? ""}
            onChange={(v) => saveField(field, v)}
            placeholder={placeholder}
          />
        ) : (
          <InlineEditableText
            value={value ?? ""}
            onChange={(v) => saveField(field, v)}
            placeholder={placeholder}
          />
        )
      ) : (
        <ReadOnlyDerivedValue empty={!value}>
          {kind === "phone" && value ? formatPhoneForDisplay(value) : value || "Not set"}
        </ReadOnlyDerivedValue>
      )}
    </AccountRow>
  );

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center gap-2">
          <Lock className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">Only owners and admins can edit.</p>
        </div>
      )}

      <Subsection title="Brand">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Brand name" field="name" value={localBusiness.name} placeholder="Your Company" />
          <EditableField label="Tagline" field="tagline" value={localBusiness.tagline} placeholder="What you do" />
          <EditableField label="Website" field="website_url" value={localBusiness.websiteUrl} placeholder="https://yoursite.com" />
          <EditableField label="Industry" field="industry" value={localBusiness.industry} placeholder="Design, Consulting, etc." />
        </dl>
      </Subsection>

      <Subsection title="Legal">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Legal name" field="legal_business_name" value={localBusiness.legalBusinessName} placeholder="Legal entity name" />
          <AccountRow label="Business type">
            {canEdit ? (
              <InlineSelect
                value={localBusiness.businessType ?? ""}
                onChange={(v) => saveField("business_type", v || null)}
                options={BUSINESS_TYPE_OPTIONS}
                placeholder="Select type"
              />
            ) : (
              <ReadOnlyDerivedValue empty={!localBusiness.businessType}>
                {BUSINESS_TYPE_OPTIONS.find(o => o.value === localBusiness.businessType)?.label || "Not set"}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
          <AccountRow label="Legal address">
            {canEdit ? (
              <CollapsibleAddress
                embedded
                address={localLegalAddress}
                onChange={handleLegalAddressChange}
              />
            ) : (
              <ReadOnlyDerivedValue empty={!formatAddressSummary(localLegalAddress)}>
                {formatAddressSummary(localLegalAddress) || "Not set"}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
        </dl>
      </Subsection>

      <Subsection title="Contact">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField
            label="Business phone"
            field="business_phone"
            value={localBusiness.businessPhone}
            placeholder="+1 (555) 123-4567"
            kind="phone"
          />
          <EditableField label="Business email" field="business_email" value={localBusiness.businessEmail} placeholder="hello@yourcompany.com" />
          <EditableField label="Location" field="location" value={localBusiness.location} placeholder="City, State" />
        </dl>
      </Subsection>

      <Subsection title="Tax & Billing">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <EditableField label="Tax ID type" field="tax_id_type" value={localBusiness.taxIdType} placeholder="EIN, VAT, ABN" />
          <EditableField label="Tax ID (last 4)" field="tax_id_last4" value={localBusiness.taxIdLast4} placeholder="1234" />
          <AccountRow label="Currency">
            {canEdit ? (
              <InlineSelect
                value={localBusiness.defaultCurrency}
                onChange={(v) => saveField("default_currency", v)}
                options={CURRENCY_OPTIONS}
              />
            ) : (
              <ReadOnlyDerivedValue>
                {localBusiness.defaultCurrency}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
          <AccountRow label="Payment terms">
            {canEdit ? (
              <InlineSelect
                value={localBusiness.paymentTerms ?? ""}
                onChange={(v) => saveField("payment_terms", v || null)}
                options={PAYMENT_TERMS_OPTIONS}
                placeholder="Select terms"
              />
            ) : (
              <ReadOnlyDerivedValue empty={!localBusiness.paymentTerms}>
                {PAYMENT_TERMS_OPTIONS.find(o => o.value === localBusiness.paymentTerms)?.label || "Not set"}
              </ReadOnlyDerivedValue>
            )}
          </AccountRow>
        </dl>
      </Subsection>
    </div>
  );
}

// ─── Services Section ───────────────────────────────────────────────────────
type FormDeliverable = {
  name: string;
  description: string;
  format: string;
  isRequired: boolean;
};

const EMPTY_DELIVERABLE: FormDeliverable = {
  name: "",
  description: "",
  format: "",
  isRequired: true,
};

const DELIVERABLE_SUGGESTIONS = [
  "Logo files",
  "Brand guidelines",
  "Style guide PDF",
  "Final handoff package",
] as const;

const RELATIONSHIP_TYPE_OPTIONS: {
  value: ServiceRelationshipType;
  label: string;
  description: string;
}[] = [
  { value: "follow_on", label: "Follow-on", description: "Clients typically need this after" },
  { value: "complement", label: "Complement", description: "Enhances value when combined" },
  { value: "prerequisite", label: "Prerequisite", description: "Should come before this service" },
  { value: "substitute", label: "Substitute", description: "Alternative for similar needs" },
  { value: "bundle_component", label: "Bundle component", description: "Part of this package" },
];

type FormRelationship = {
  id?: string;
  relatedServiceId: string;
  relatedServiceName: string;
  relationshipType: ServiceRelationshipType;
};

function mapFormRelationships(
  serviceId: string,
  relationships: FormRelationship[],
): OperatorBusinessService["relationships"] {
  return relationships.map((relationship) => ({
    id: relationship.id ?? `temp-${relationship.relatedServiceId}`,
    serviceId,
    relatedServiceId: relationship.relatedServiceId,
    relatedServiceName: relationship.relatedServiceName,
    relationshipType: relationship.relationshipType,
    strength: 50,
    typicalGapDays: null,
    recommendationNote: null,
    source: "manual" as const,
  }));
}

async function syncServiceRelationships(
  serviceId: string,
  formRelationships: FormRelationship[],
  originalRelationships: OperatorBusinessService["relationships"],
): Promise<string | null> {
  const originalById = new Map(originalRelationships.map((relationship) => [relationship.id, relationship]));

  for (const original of originalRelationships) {
    const stillPresent = formRelationships.some((relationship) => relationship.id === original.id);
    if (!stillPresent) {
      const result = await deleteServiceRelationship(original.id);
      if ("error" in result && result.error) return result.error;
    }
  }

  for (const relationship of formRelationships) {
    if (relationship.id) {
      const original = originalById.get(relationship.id);
      if (original && original.relationshipType !== relationship.relationshipType) {
        const result = await updateServiceRelationship(relationship.id, {
          relationship_type: relationship.relationshipType,
        });
        if ("error" in result && result.error) return result.error;
      }
      continue;
    }

    const result = await createServiceRelationship({
      service_id: serviceId,
      related_service_id: relationship.relatedServiceId,
      relationship_type: relationship.relationshipType,
      strength: 50,
      source: "manual",
    });
    if ("error" in result && result.error) return result.error;
  }

  return null;
}

async function createServiceRelationships(
  serviceId: string,
  formRelationships: FormRelationship[],
): Promise<string | null> {
  for (const relationship of formRelationships) {
    const result = await createServiceRelationship({
      service_id: serviceId,
      related_service_id: relationship.relatedServiceId,
      relationship_type: relationship.relationshipType,
      strength: 50,
      source: "manual",
    });
    if ("error" in result && result.error) return result.error;
  }

  return null;
}

function ServiceRelationshipsEditor({
  relationships,
  onChange,
  allServices,
  currentServiceId,
}: {
  relationships: FormRelationship[];
  onChange: (relationships: FormRelationship[]) => void;
  allServices: OperatorBusinessService[];
  currentServiceId: string | null;
}) {
  const usedRelatedIds = new Set(relationships.map((relationship) => relationship.relatedServiceId));
  const availableToAdd = allServices.filter(
    (service) => service.id !== currentServiceId && !usedRelatedIds.has(service.id),
  );

  const addRelationship = () => {
    const nextService = availableToAdd[0];
    if (!nextService) return;

    onChange([
      ...relationships,
      {
        relatedServiceId: nextService.id,
        relatedServiceName: nextService.name,
        relationshipType: "follow_on",
      },
    ]);
  };

  const updateAt = (idx: number, patch: Partial<FormRelationship>) => {
    onChange(relationships.map((relationship, index) => (index === idx ? { ...relationship, ...patch } : relationship)));
  };

  const removeAt = (idx: number) => {
    onChange(relationships.filter((_, index) => index !== idx));
  };

  const optionsForRow = (idx: number) => {
    const usedElsewhere = new Set(
      relationships
        .filter((_, index) => index !== idx)
        .map((relationship) => relationship.relatedServiceId),
    );

    return allServices.filter(
      (service) =>
        service.id !== currentServiceId &&
        (!usedElsewhere.has(service.id) ||
          service.id === relationships[idx]?.relatedServiceId),
    );
  };

  return (
    <div className="space-y-3 border-t border-border/40 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-foreground">Related services</p>
              {relationships.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] font-medium tabular-nums"
                >
                  {relationships.length}
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Follow-ons, prerequisites, complements, and bundle links
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-3"
          onClick={addRelationship}
          disabled={availableToAdd.length === 0}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {allServices.filter((service) => service.id !== currentServiceId).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-5 text-center">
          <Link2 className="mx-auto size-5 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-muted-foreground">Add another service first</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Relationships link this service to others in your catalog.
          </p>
        </div>
      ) : relationships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-5 text-center">
          <Link2 className="mx-auto size-5 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-muted-foreground">No related services yet</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Link follow-ons, prerequisites, substitutes, or bundle components.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {relationships.map((relationship, idx) => (
            <div
              key={relationship.id ?? `${relationship.relatedServiceId}-${idx}`}
              className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <Select
                  value={relationship.relatedServiceId}
                  onValueChange={(value) => {
                    const service = allServices.find((item) => item.id === value);
                    if (!service) return;
                    updateAt(idx, {
                      relatedServiceId: service.id,
                      relatedServiceName: service.name,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsForRow(idx).map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAt(idx)}
                  aria-label={`Remove relationship ${idx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5 pl-8">
                <span className="text-[11px] font-medium text-muted-foreground">Relationship</span>
                <Select
                  value={relationship.relationshipType}
                  onValueChange={(value) =>
                    updateAt(idx, { relationshipType: value as ServiceRelationshipType })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={addRelationship}
            disabled={availableToAdd.length === 0}
          >
            <Plus className="size-3.5" />
            Add another relationship
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceDeliverablesEditor({
  deliverables,
  onChange,
}: {
  deliverables: FormDeliverable[];
  onChange: (deliverables: FormDeliverable[]) => void;
}) {
  const addDeliverable = (preset?: Partial<FormDeliverable>) => {
    onChange([...deliverables, { ...EMPTY_DELIVERABLE, ...preset }]);
  };

  const updateAt = (idx: number, patch: Partial<FormDeliverable>) => {
    onChange(deliverables.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const removeAt = (idx: number) => {
    onChange(deliverables.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3 border-t border-border/40 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileBox className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-foreground">Deliverables</p>
              {deliverables.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] font-medium tabular-nums"
                >
                  {deliverables.length}
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              What clients receive when they buy this service
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-3"
          onClick={() => addDeliverable()}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-5 text-center">
          <FileBox
            className="mx-auto size-5 text-muted-foreground/50"
            strokeWidth={1.5}
          />
          <p className="mt-2 text-sm text-muted-foreground">No deliverables yet</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            List tangible outputs so Salt can describe scope in proposals and
            plays.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {DELIVERABLE_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addDeliverable({ name: suggestion })}
                className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {deliverables.map((deliverable, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <Input
                  value={deliverable.name}
                  onChange={(e) => updateAt(idx, { name: e.target.value })}
                  placeholder="Deliverable name"
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAt(idx)}
                  aria-label={`Remove deliverable ${idx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 pl-8 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Details
                  </span>
                  <Input
                    value={deliverable.description}
                    onChange={(e) =>
                      updateAt(idx, { description: e.target.value })
                    }
                    placeholder="Optional scope note"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Format
                  </span>
                  <Input
                    value={deliverable.format}
                    onChange={(e) => updateAt(idx, { format: e.target.value })}
                    placeholder="PDF, Figma, PNG…"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pl-8">
                <p className="text-[11px] text-muted-foreground">
                  {deliverable.isRequired
                    ? "Always included in this service"
                    : "Optional add-on clients can choose"}
                </p>
                <label className="flex shrink-0 cursor-pointer items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Required
                  </span>
                  <Switch
                    size="sm"
                    checked={deliverable.isRequired}
                    onCheckedChange={(checked) =>
                      updateAt(idx, { isRequired: checked })
                    }
                  />
                </label>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => addDeliverable()}
          >
            <Plus className="size-3.5" />
            Add another deliverable
          </Button>
        </div>
      )}
    </div>
  );
}

const EMPTY_SERVICE_FORM = {
  name: "",
  description: "",
  typicalTimeline: "",
  basePriceDollars: "",
  deliverables: [] as FormDeliverable[],
  relationships: [] as FormRelationship[],
};

function ServicesSection({
  services: initialServices,
  canEdit,
}: {
  services: OperatorBusinessService[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_SERVICE_FORM);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const resetForm = () => setForm(EMPTY_SERVICE_FORM);

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (service: OperatorBusinessService) => {
    setAddOpen(false);
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      typicalTimeline: service.typicalTimeline ?? "",
      basePriceDollars: service.basePriceCents ? (service.basePriceCents / 100).toString() : "",
      deliverables: service.deliverables.map((d) => ({
        name: d.name,
        description: d.description ?? "",
        format: d.format ?? "",
        isRequired: d.isRequired,
      })),
      relationships: service.relationships.map((relationship) => ({
        id: relationship.id,
        relatedServiceId: relationship.relatedServiceId,
        relatedServiceName: relationship.relatedServiceName,
        relationshipType: relationship.relationshipType,
      })),
    });
  };

  const closeForm = () => {
    setAddOpen(false);
    setEditingId(null);
    resetForm();
  };

  const submitForm = () => {
    const name = form.name.trim();
    if (!name) return;

    startTransition(async () => {
      const priceValue = form.basePriceDollars
        ? Math.round(parseFloat(form.basePriceDollars) * 100)
        : null;
      const payload = {
        name,
        description: form.description.trim() || null,
        typical_timeline: form.typicalTimeline.trim() || null,
        base_price_cents: priceValue,
        currency: "USD" as const,
        is_active: true,
      };

      // Prepare deliverables payload
      const deliverablesPayload = form.deliverables
        .filter((d) => d.name.trim())
        .map((d) => ({
          name: d.name.trim(),
          description: d.description.trim() || null,
          format: d.format.trim() || null,
          is_required: d.isRequired,
        }));

      if (editingId) {
        const originalService = services.find((service) => service.id === editingId);
        const res = await updateStudioService(editingId, payload);
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        // Also update deliverables
        if (deliverablesPayload.length > 0 || form.deliverables.length === 0) {
          const delRes = await updateServiceDeliverables(editingId, deliverablesPayload);
          if ("error" in delRes && delRes.error) {
            toast.error(delRes.error);
            return;
          }
        }
        const relationshipError = await syncServiceRelationships(
          editingId,
          form.relationships,
          originalService?.relationships ?? [],
        );
        if (relationshipError) {
          toast.error(relationshipError);
          return;
        }
        setServices((prev) =>
          prev.map((service) =>
            service.id === editingId
              ? {
                  ...service,
                  name,
                  description: payload.description,
                  typicalTimeline: payload.typical_timeline,
                  basePriceCents: payload.base_price_cents,
                  deliverables: deliverablesPayload.map((d) => ({
                    name: d.name,
                    description: d.description,
                    format: d.format,
                    isRequired: d.is_required,
                  })),
                  relationships: mapFormRelationships(editingId, form.relationships),
                }
              : service,
          ),
        );
        toast.success("Service updated");
        closeForm();
        router.refresh();
        return;
      } else {
        const res = await createStudioService(payload);
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        const newServiceId = res.id;
        // Save deliverables if any were entered
        if (deliverablesPayload.length > 0 && newServiceId) {
          const delRes = await updateServiceDeliverables(newServiceId, deliverablesPayload);
          if ("error" in delRes && delRes.error) {
            toast.error(delRes.error);
          }
        }
        if (newServiceId && form.relationships.length > 0) {
          const relationshipError = await createServiceRelationships(newServiceId, form.relationships);
          if (relationshipError) {
            toast.error(relationshipError);
            return;
          }
        }
        setServices((prev) => [
          ...prev,
          {
            id: newServiceId ?? crypto.randomUUID(),
            name,
            description: payload.description,
            category: null,
            pricingType: null,
            priceMin: null,
            priceMax: null,
            basePriceCents: payload.base_price_cents,
            currency: payload.currency,
            typicalTimeline: payload.typical_timeline,
            isActive: true,
            isBundle: false,
            activeWorkCount: 0,
            // AI context fields (empty for new services)
            valueProposition: null,
            valuePropositionSource: null,
            differentiators: [],
            differentiatorsSource: null,
            prerequisites: [],
            prerequisitesSource: null,
            discoveryQuestions: [],
            discoveryQuestionsSource: null,
            aiPitch: null,
            aiPitchSource: null,
            // Sales intelligence (empty for new services)
            salesContext: {
              objections: [],
              competitivePositioning: { vsDiy: null, vsAgencies: null, vsFreelancers: null, uniqueAdvantage: null },
              idealTiming: { triggers: [], buyingSignals: [], seasonalRelevance: null },
            },
            salesContextSource: null,
            pricingIntelligence: {
              roiMetrics: [],
              paybackPeriod: null,
              discountRules: [],
              floorPriceCents: null,
              anchors: { agencyEquivalentCents: null, diyCostEstimateCents: null, opportunityCost: null },
            },
            pricingIntelligenceSource: null,
            aiGenerationContext: {
              tone: null,
              personalityNotes: null,
              includeKeywords: [],
              avoidKeywords: [],
              primaryOutcomes: [],
              proofPriority: [],
              pitchVariants: { elevator: null, email: null, proposalIntro: null },
            },
            aiGenerationContextSource: null,
            deliverables: deliverablesPayload.map((d) => ({
              name: d.name,
              description: d.description,
              format: d.format,
              isRequired: d.is_required,
            })),
            deliverablesSource: deliverablesPayload.length > 0 ? "manual" : null,
            relationships: newServiceId
              ? mapFormRelationships(newServiceId, form.relationships)
              : [],
            icpMappings: [],
          },
        ]);
        toast.success("Service added");
        closeForm();
        router.refresh();
      }
    });
  };

  const removeService = (serviceId: string) => {
    startTransition(async () => {
      const res = await deleteStudioService(serviceId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setServices((prev) => prev.filter((service) => service.id !== serviceId));
      if (editingId === serviceId) closeForm();
      toast("Service removed");
      router.refresh();
    });
  };

  return (
    <MemoryOverviewSection
      title="Services"
      variant="heading"
      actions={
        canEdit && !addOpen && editingId === null ? (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="size-3.5" /> Add service
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {canEdit && addOpen && (
          <ServiceForm
            title="New service"
            form={form}
            setForm={setForm}
            allServices={services}
            editingServiceId={null}
            isPending={pending}
            submitLabel="Save service"
            onSubmit={submitForm}
            onCancel={closeForm}
          />
        )}

        {services.length > 0 ? (
          <div className="space-y-3">
            {services.map((service) =>
              editingId === service.id ? (
                <ServiceForm
                  key={service.id}
                  title="Edit service"
                  form={form}
                  setForm={setForm}
                  allServices={services}
                  editingServiceId={service.id}
                  isPending={pending}
                  submitLabel="Save changes"
                  onSubmit={submitForm}
                  onCancel={closeForm}
                  variant="edit"
                />
              ) : (
                <ServiceCard
                  key={service.id}
                  service={service}
                  canEdit={canEdit}
                  onEdit={() => openEdit(service)}
                  onDelete={() => removeService(service.id)}
                  isPending={pending}
                />
              ),
            )}
          </div>
        ) : !addOpen ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Briefcase className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-muted-foreground">No services yet.</p>
            {canEdit && (
              <Button size="sm" variant="outline" className="mt-4" onClick={openAdd}>
                <Plus className="size-3.5" /> Add service
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </MemoryOverviewSection>
  );
}

function ServiceFormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

function ServiceForm({
  title,
  form,
  setForm,
  allServices,
  editingServiceId,
  isPending,
  submitLabel,
  onSubmit,
  onCancel,
  variant = "add",
}: {
  title: string;
  form: typeof EMPTY_SERVICE_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_SERVICE_FORM>>;
  allServices: OperatorBusinessService[];
  editingServiceId: string | null;
  isPending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  variant?: "add" | "edit";
}) {
  const isEdit = variant === "edit";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-sm",
        isEdit
          ? "border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04]"
          : "border-border/60 bg-gradient-to-br from-card via-card to-muted/20",
      )}
    >
      <div className="border-b border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEdit
                ? "Update what you offer and how Salt should talk about it."
                : "Define a service Salt can reference in pitches, proposals, and plays."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-border/50 bg-background/70 p-4 space-y-4">
          <ServiceFormField label="Service name">
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Brand identity, website redesign…"
              autoFocus
            />
          </ServiceFormField>

          <ServiceFormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="What's included, who it's for, and what clients walk away with"
              rows={3}
              className="field-sizing-fixed min-h-[5.5rem] resize-y leading-relaxed"
            />
          </ServiceFormField>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <label className="text-xs font-medium text-foreground">
              Base price
            </label>
            <label className="text-xs font-medium text-foreground">
              Typical timeline
            </label>

            <Input
              type="number"
              value={form.basePriceDollars}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  basePriceDollars: e.target.value,
                }))
              }
              placeholder="8000"
            />
            <Input
              value={form.typicalTimeline}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  typicalTimeline: e.target.value,
                }))
              }
              placeholder="2–4 weeks"
            />
          </div>

          <ServiceDeliverablesEditor
            deliverables={form.deliverables}
            onChange={(deliverables) =>
              setForm((prev) => ({ ...prev, deliverables }))
            }
          />

          <ServiceRelationshipsEditor
            relationships={form.relationships}
            onChange={(relationships) =>
              setForm((prev) => ({ ...prev, relationships }))
            }
            allServices={allServices}
            currentServiceId={editingServiceId}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 px-4"
          disabled={!form.name.trim() || isPending}
          onClick={onSubmit}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  canEdit,
  onEdit,
  onDelete,
  isPending,
}: {
  service: OperatorBusinessService;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [contextOpen, setContextOpen] = useState(false);

  const priceDisplay = service.basePriceCents
    ? `$${(service.basePriceCents / 100).toLocaleString()}`
    : service.priceMin
      ? `$${service.priceMin.toLocaleString()}${service.priceMax ? `–$${service.priceMax.toLocaleString()}` : "+"}`
      : null;

  const hasAIContext =
    service.valueProposition ||
    service.differentiators.length > 0 ||
    service.prerequisites.length > 0 ||
    service.discoveryQuestions.length > 0 ||
    service.icpMappings.length > 0 ||
    service.salesContext.objections.length > 0 ||
    service.salesContext.competitivePositioning.uniqueAdvantage ||
    service.pricingIntelligence.roiMetrics.length > 0;

  const hasProposedContent =
    service.valuePropositionSource === "ai_proposed" ||
    service.differentiatorsSource === "ai_proposed" ||
    service.prerequisitesSource === "ai_proposed" ||
    service.discoveryQuestionsSource === "ai_proposed" ||
    service.salesContextSource === "ai_proposed" ||
    service.pricingIntelligenceSource === "ai_proposed";

  const followOnRelationships = service.relationships.filter(
    (r) => r.relationshipType === "follow_on" || r.relationshipType === "complement"
  );
  const bundleComponents = service.relationships.filter(
    (r) => r.relationshipType === "bundle_component"
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{service.name}</p>
            {service.isBundle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
                <Package className="size-2.5" />
                Bundle
              </span>
            )}
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
            <button
              type="button"
              onClick={onEdit}
              disabled={isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition disabled:opacity-50"
              aria-label="Edit service"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
              aria-label="Delete service"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Price, timeline, and relationship pills */}
      {(priceDisplay || service.typicalTimeline || service.icpMappings.length > 0 || followOnRelationships.length > 0 || bundleComponents.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {priceDisplay && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
              {priceDisplay}
            </span>
          )}
          {service.typicalTimeline && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
              {service.typicalTimeline}
            </span>
          )}
          {/* ICP alignment badges */}
          {service.icpMappings.map((mapping) => (
            <span
              key={mapping.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] text-primary"
            >
              <Target className="size-2.5" />
              {mapping.icpSegmentName}
            </span>
          ))}
          {/* Follow-on / complement relationships */}
          {followOnRelationships.map((rel) => (
            <span
              key={rel.id}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-600 dark:text-emerald-400"
            >
              <ArrowRight className="size-2.5" />
              {rel.relationshipType === "follow_on" ? "→" : "+"} {rel.relatedServiceName}
            </span>
          ))}
          {/* Bundle components */}
          {bundleComponents.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/5 px-2.5 py-1 text-[11px] text-violet-600 dark:text-violet-400">
              <Package className="size-2.5" />
              {bundleComponents.length} included
            </span>
          )}
        </div>
      )}

      {/* Deliverables section - always visible */}
      <div className="mt-3 border-t border-border/40 pt-3">
        <div className="flex items-center gap-1.5">
          <FileBox className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Deliverables</span>
        </div>

        {service.deliverables.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {service.deliverables.map((d, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm"
              >
                <Check className={cn(
                  "size-3.5 mt-0.5 shrink-0",
                  d.isRequired ? "text-emerald-500" : "text-muted-foreground/40"
                )} />
                <div className="min-w-0 flex-1">
                  <span className="text-foreground">{d.name}</span>
                  {d.format && (
                    <span className="ml-1.5 text-muted-foreground text-xs">({d.format})</span>
                  )}
                  {d.description && (
                    <p className="text-muted-foreground text-xs mt-0.5">{d.description}</p>
                  )}
                </div>
                {!d.isRequired && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    Optional
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-muted-foreground/60 italic">
            No deliverables defined.
            {canEdit && " Edit this service to add what clients receive."}
          </p>
        )}
      </div>

      {/* Related Services section - always visible */}
      <div className="mt-3 border-t border-border/40 pt-3">
        <div className="flex items-center gap-1.5">
          <Link2 className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Related Services</span>
        </div>

        {service.relationships.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {service.relationships.map((rel) => (
              <span
                key={rel.id}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <span className="text-muted-foreground/60">
                  {rel.relationshipType === "follow_on" && "→"}
                  {rel.relationshipType === "complement" && "+"}
                  {rel.relationshipType === "prerequisite" && "←"}
                  {rel.relationshipType === "substitute" && "↔"}
                  {rel.relationshipType === "bundle_component" && "◦"}
                </span>
                {rel.relatedServiceName}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-muted-foreground/60 italic">
            No related services yet.
            {canEdit && " Edit this service to link follow-ons, prerequisites, or bundles."}
          </p>
        )}
      </div>

      {/* AI Context section - always visible */}
      <div className="mt-3 border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={() => setContextOpen(!contextOpen)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition w-full"
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              contextOpen && "rotate-180",
            )}
          />
          <Sparkles className="size-3" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]">AI Context</span>
          {hasProposedContent && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary ml-auto">
              <Sparkles className="size-2" />
              New
            </span>
          )}
          {!hasAIContext && (
            <span className="text-[10px] text-muted-foreground/60 ml-auto">Empty</span>
          )}
        </button>

        {contextOpen && (
          <div className="mt-3 space-y-3">
            {!hasAIContext && (
              <p className="text-[11px] text-muted-foreground/60 italic">
                Salt will learn value propositions, differentiators, objections, and ROI metrics from your conversations.
              </p>
            )}
              {/* Value proposition */}
              {service.valueProposition && (
                <AIContextField
                  label="Value proposition"
                  source={service.valuePropositionSource}
                >
                  <p className="text-sm text-foreground">{service.valueProposition}</p>
                </AIContextField>
              )}

              {/* Differentiators */}
              {service.differentiators.length > 0 && (
                <AIContextField
                  label="Differentiators"
                  source={service.differentiatorsSource}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {service.differentiators.map((d, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </AIContextField>
              )}

              {/* Prerequisites */}
              {service.prerequisites.length > 0 && (
                <AIContextField
                  label="Prerequisites"
                  source={service.prerequisitesSource}
                >
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {service.prerequisites.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground/60">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </AIContextField>
              )}

              {/* Discovery questions */}
              {service.discoveryQuestions.length > 0 && (
                <AIContextField
                  label="Discovery questions"
                  source={service.discoveryQuestionsSource}
                >
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {service.discoveryQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground/60">{i + 1}.</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </AIContextField>
              )}

              {/* ROI Metrics */}
              {service.pricingIntelligence.roiMetrics.length > 0 && (
                <AIContextField
                  label="ROI metrics"
                  source={service.pricingIntelligenceSource}
                >
                  <div className="space-y-1.5">
                    {service.pricingIntelligence.roiMetrics.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <TrendingUp className="size-3 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">{m.metric}:</span>
                        <span className="font-medium text-foreground">{m.typicalResult}</span>
                      </div>
                    ))}
                  </div>
                </AIContextField>
              )}

              {/* Competitive positioning */}
              {service.salesContext.competitivePositioning.uniqueAdvantage && (
                <AIContextField
                  label="Unique advantage"
                  source={service.salesContextSource}
                >
                  <p className="text-sm text-foreground">
                    {service.salesContext.competitivePositioning.uniqueAdvantage}
                  </p>
                </AIContextField>
              )}

              {/* Objections */}
              {service.salesContext.objections.length > 0 && (
                <AIContextField
                  label="Common objections"
                  source={service.salesContextSource}
                >
                  <div className="space-y-2">
                    {service.salesContext.objections.slice(0, 3).map((obj, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="size-3 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground italic">"{obj.objection}"</span>
                        </div>
                        <p className="ml-5 mt-1 text-foreground">{obj.response}</p>
                      </div>
                    ))}
                    {service.salesContext.objections.length > 3 && (
                      <p className="text-[11px] text-muted-foreground ml-5">
                        +{service.salesContext.objections.length - 3} more
                      </p>
                    )}
                  </div>
                </AIContextField>
              )}

              {/* Ideal timing triggers */}
              {service.salesContext.idealTiming.triggers.length > 0 && (
                <AIContextField
                  label="Best timing"
                  source={service.salesContextSource}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {service.salesContext.idealTiming.triggers.map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-[11px] text-amber-600 dark:text-amber-400"
                      >
                        <Zap className="size-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </AIContextField>
              )}

              {/* Pitch variants */}
              {service.aiGenerationContext.pitchVariants.elevator && (
                <AIContextField
                  label="Elevator pitch"
                  source={service.aiGenerationContextSource}
                >
                  <p className="text-sm text-foreground italic">
                    "{service.aiGenerationContext.pitchVariants.elevator}"
                  </p>
                </AIContextField>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

function AIContextField({
  label,
  source,
  children,
}: {
  label: string;
  source: "manual" | "ai_proposed" | "ai_confirmed" | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {source === "ai_proposed" && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
            <Sparkles className="size-2" />
            Salt proposed
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────
