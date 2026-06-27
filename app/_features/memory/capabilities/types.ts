export type CapabilityId =
  | "invoicing"
  | "email_follow_up"
  | "scheduling"
  | "proposals_contracts"
  | "retainer_renewals";

export type CapabilityEntityType = "person" | "org" | "work";

export type CapabilityFieldPath = string;

export type CapabilitySpec = {
  id: CapabilityId;
  label: string;
  playSlug: string;
  requiredFields: Partial<Record<CapabilityEntityType, CapabilityFieldPath[]>>;
};

export type CapabilityReadiness = {
  capability: CapabilitySpec;
  entityType: CapabilityEntityType;
  ready: boolean;
  missingFields: CapabilityFieldPath[];
};
