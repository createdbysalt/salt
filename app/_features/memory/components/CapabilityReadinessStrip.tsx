import type { CapabilityReadiness } from "@/app/_features/memory/capabilities/types";

const FIELD_LABELS: Record<string, string> = {
  addressLine1: "address",
  billingContactId: "billing contact",
  billingEmail: "billing email",
  billingCycle: "billing cycle",
  city: "city",
  contractValueOrScope: "price or scope",
  country: "country",
  currency: "currency",
  decisionDate: "decision date",
  email: "email",
  name: "name",
  paymentTerms: "payment terms",
  postalCode: "postal code",
  primaryContactName: "primary contact",
  "primaryContact.name": "primary contact",
  serviceId: "service",
  renewalDate: "renewal date",
  retainerMrrCents: "retainer MRR",
  taxId: "tax ID",
  timezone: "timezone",
  workTypeRetainer: "retainer work type",
};

function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function CapabilityReadinessStrip({ readiness }: { readiness: CapabilityReadiness[] }) {
  if (!readiness.length) return null;

  const readyCount = readiness.filter((item) => item.ready).length;
  const missingFields = [
    ...new Set(
      readiness
        .flatMap((item) => item.missingFields)
        .map(labelFor),
    ),
  ];

  if (missingFields.length === 0) {
    return (
      <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
        Play readiness: ready for {readyCount} workflow{readyCount === 1 ? "" : "s"}.
      </div>
    );
  }

  const visibleMissing = missingFields.slice(0, 4);
  const overflowCount = missingFields.length - visibleMissing.length;

  return (
    <div
      className="mb-4 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      title={`Missing: ${missingFields.join(", ")}`}
    >
      <span className="font-medium text-foreground/80">What Salt needs next:</span>{" "}
      {visibleMissing.join(", ")}
      {overflowCount > 0 ? `, +${overflowCount} more` : ""}.
    </div>
  );
}
