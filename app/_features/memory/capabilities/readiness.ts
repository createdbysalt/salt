import type {
  CapabilityEntityType,
  CapabilityFieldPath,
  CapabilityReadiness,
  CapabilitySpec,
} from "./types";

const CAPABILITY_SPECS: CapabilitySpec[] = [
  {
    id: "invoicing",
    label: "Invoice-ready",
    playSlug: "send-invoice",
    requiredFields: {
      person: ["name", "billingEmail", "addressLine1", "city", "postalCode", "country"],
      org: ["name", "billingEmail", "addressLine1", "city", "postalCode", "country", "taxId"],
      work: ["billingContactId", "paymentTerms", "currency", "contractValueOrScope"],
    },
  },
  {
    id: "email_follow_up",
    label: "Follow-up-ready",
    playSlug: "quiet-lead-nudge",
    requiredFields: {
      person: ["email"],
      org: ["primaryContact.name"],
      work: ["primaryContactName"],
    },
  },
  {
    id: "scheduling",
    label: "Meeting-ready",
    playSlug: "meeting-scheduler",
    requiredFields: {
      person: ["email", "timezone"],
      org: ["primaryContact.name"],
      work: ["primaryContactName"],
    },
  },
  {
    id: "proposals_contracts",
    label: "Proposal-ready",
    playSlug: "proposal-contract",
    requiredFields: {
      org: ["name", "addressLine1", "city", "postalCode", "country"],
      work: ["serviceId", "contractValueOrScope", "decisionDate"],
    },
  },
  {
    id: "retainer_renewals",
    label: "Renewal-ready",
    playSlug: "retainer-renewal",
    requiredFields: {
      work: ["workTypeRetainer", "retainerMrrCents", "renewalDate", "billingCycle", "billingContactId"],
    },
  },
  // Billing capabilities
  {
    id: "send_invoice",
    label: "Send-ready",
    playSlug: "send-invoice",
    requiredFields: {
      billing: ["billingContactEmail", "amountCents", "lineItems"],
    },
  },
  {
    id: "payment_reminder",
    label: "Reminder-ready",
    playSlug: "payment-reminder",
    requiredFields: {
      billing: ["billingContactEmail", "amountCents", "dueAt"],
    },
  },
  {
    id: "pay_bill",
    label: "Pay-ready",
    playSlug: "pay-bill",
    requiredFields: {
      billing: ["vendorPaymentMethod", "amountCents"],
    },
  },
];

function getPathValue(record: Record<string, unknown>, path: CapabilityFieldPath): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return null;
    return (current as Record<string, unknown>)[segment];
  }, record);
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function hasField(record: Record<string, unknown>, field: CapabilityFieldPath): boolean {
  if (field === "contractValueOrScope") {
    return hasValue(record.contractValueCents) || hasValue(record.finalPriceCents) || hasValue(record.scopeItems);
  }

  if (field === "workTypeRetainer") {
    return record.workType === "retainer";
  }

  return hasValue(getPathValue(record, field));
}

export function getEntityReadiness(
  entityType: CapabilityEntityType,
  record: Record<string, unknown>,
): CapabilityReadiness[] {
  return CAPABILITY_SPECS.flatMap((capability) => {
    const requiredFields = capability.requiredFields[entityType];
    if (!requiredFields) return [];

    const missingFields = requiredFields.filter((field) => !hasField(record, field));
    return [
      {
        capability,
        entityType,
        ready: missingFields.length === 0,
        missingFields,
      },
    ];
  });
}
