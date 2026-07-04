"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AccountRow,
  InlineDatePicker,
  InlineEditableText,
  InlineMoney,
  InlineSelect,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { CapabilityReadinessStrip } from "@/app/_features/memory/components/CapabilityReadinessStrip";
import { TagEditor } from "@/app/_features/memory/components/TagEditor";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import { getEntityReadiness } from "@/app/_features/memory/capabilities/readiness";
import { getVocabularyOptions } from "@/app/_features/memory/taxonomy/registry";
import { OrgSearchCombobox } from "@/app/_features/memory/components/OrgSearchCombobox";
import { PersonSearchCombobox } from "@/app/_features/memory/components/PersonSearchCombobox";
import { WorkSearchCombobox } from "@/app/_features/memory/components/WorkSearchCombobox";
import type { BillingDetailViewModel } from "../detail-types";
import {
  updateBillingRecordField,
  type BillingRecordField,
} from "../actions/update-billing-record";
import { BILLING_STATUS_LABEL, formatBillingMoney } from "../data";

function formatMoney(cents: number, currency: string): string {
  return formatBillingMoney(cents, currency);
}
import { BillingLineItemsSection } from "./BillingLineItemsSection";
import { ensureBillingTagPresets } from "../tags/ensure-presets";

type BillingOverviewTabProps = {
  billing: BillingDetailViewModel;
};

const STATUS_OPTIONS = getVocabularyOptions("billing_status");

// billing_records.currency CHECK is the uppercase ISO-4217 canon
// (20260703180000) — options come straight from the registry vocabulary,
// labeled with the code itself.
const CURRENCY_OPTIONS = getVocabularyOptions("currency").map((o) => ({
  value: o.value,
  label: o.value,
}));

export function BillingOverviewTab({ billing }: BillingOverviewTabProps) {
  const isPayable = billing.direction === "payable";

  const [number, setNumber] = useState(billing.number);
  const [status, setStatus] = useState(billing.status);
  const [currency, setCurrency] = useState(billing.currency);
  const [partyName, setPartyName] = useState(billing.partyLabel);
  const [billingContactName, setBillingContactName] = useState(
    billing.partySubtitle ?? ""
  );
  const [linkedWorkName, setLinkedWorkName] = useState(billing.work?.title ?? "");
  const [amountCents, setAmountCents] = useState<number | null>(billing.amountCents);
  const [amountPaidCents, setAmountPaidCents] = useState<number | null>(billing.amountPaidCents);
  const [issuedDate, setIssuedDate] = useState<string | null>(billing.issuedAt);
  const [dueDate, setDueDate] = useState<string | null>(billing.dueAt);
  const [paidDate, setPaidDate] = useState<string | null>(billing.paidAt ?? null);

  useEffect(() => {
    ensureBillingTagPresets();
  }, []);

  async function saveField(field: BillingRecordField, value: string | number | null) {
    const result = await updateBillingRecordField(billing.id, field, value);
    if (result.ok) {
      toast.success(`Updated ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
    } else {
      toast.error(result.message);
    }
  }

  const readiness = getEntityReadiness("billing", {
    billingContactEmail: billingContactName ? `${billingContactName}@example.com` : null,
    amountCents: billing.balanceCents > 0 ? billing.balanceCents : null,
    lineItems: billing.lineItems.length > 0 ? billing.lineItems : null,
    dueAt: billing.dueLabel,
    vendorPaymentMethod: isPayable ? null : "n/a",
  });

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt variant="heading">
        <p className="text-sm leading-relaxed text-foreground/80">{billing.summary}</p>
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Worth attention" salt variant="heading">
        <p className="text-sm leading-relaxed text-foreground/80">
          {billing.worthAttention?.reason ?? "Nothing needs attention right now."}
        </p>
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Details" variant="heading">
        <CapabilityReadinessStrip readiness={readiness} />

        <div className="space-y-5">
          {/* Invoice/Bill section */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isPayable ? "Bill" : "Invoice"}
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label={isPayable ? "Bill #" : "Invoice #"}>
                <InlineEditableText
                  value={number}
                  onChange={(value) => {
                    setNumber(value);
                    saveField("number", value);
                  }}
                  placeholder="Add number"
                />
              </AccountRow>
              <AccountRow label="Status">
                <InlineSelect
                  value={status}
                  onChange={(value) => {
                    setStatus(value as typeof status);
                    saveField("status", value);
                  }}
                  options={STATUS_OPTIONS}
                />
              </AccountRow>
              <AccountRow label="Provider">
                <span className="text-sm text-foreground">
                  {billing.providerDisplay.label}
                </span>
              </AccountRow>
              <AccountRow label="Source">
                <span className="text-sm text-muted-foreground">
                  {billing.originLabel}
                </span>
              </AccountRow>
            </dl>
          </div>

          {/* Customer/Vendor section */}
          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isPayable ? "Vendor" : "Customer"}
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Organization">
                <OrgSearchCombobox
                  value={partyName}
                  onChange={setPartyName}
                  onSelectOption={(option) => {
                    void saveField("organizationId", option.id);
                  }}
                  placeholder="Search organizations..."
                  inline
                />
              </AccountRow>
              <AccountRow label={isPayable ? "Contact" : "Billing contact"}>
                <PersonSearchCombobox
                  value={billingContactName}
                  onChange={setBillingContactName}
                  onSelectOption={(option) => {
                    void saveField("personId", option.id);
                  }}
                  placeholder="Search people..."
                  inline
                />
              </AccountRow>
              <AccountRow label="Linked work">
                <WorkSearchCombobox
                  value={linkedWorkName}
                  onChange={setLinkedWorkName}
                  onSelectOption={(option) => {
                    void saveField("projectId", option.id);
                  }}
                  placeholder="Link to work..."
                  inline
                />
              </AccountRow>
            </dl>
          </div>

          {/* Money section */}
          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Money
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Total">
                <InlineMoney
                  valueCents={amountCents}
                  onChange={(value) => {
                    setAmountCents(value);
                    saveField("amount", value);
                  }}
                  currency={currency}
                />
              </AccountRow>
              <AccountRow label="Paid">
                <InlineMoney
                  valueCents={amountPaidCents}
                  onChange={(value) => {
                    setAmountPaidCents(value);
                    saveField("amountPaid", value);
                  }}
                  currency={currency}
                />
              </AccountRow>
              <AccountRow label="Outstanding">
                <span
                  className={
                    (amountCents ?? 0) - (amountPaidCents ?? 0) > 0
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {formatMoney((amountCents ?? 0) - (amountPaidCents ?? 0), currency)}
                </span>
              </AccountRow>
              <AccountRow label="Currency">
                <InlineSelect
                  value={currency}
                  onChange={(value) => {
                    setCurrency(value);
                    saveField("currency", value);
                  }}
                  options={CURRENCY_OPTIONS}
                />
              </AccountRow>
              {!isPayable && billing.retainerTier ? (
                <AccountRow label="Retainer tier">{billing.retainerTier}</AccountRow>
              ) : null}
              {!isPayable && billing.mrr ? (
                <AccountRow label="MRR">{billing.mrr}</AccountRow>
              ) : null}
            </dl>
          </div>

          {/* Schedule section */}
          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Schedule
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Issued">
                <InlineDatePicker
                  value={issuedDate}
                  onChange={(value) => {
                    setIssuedDate(value);
                    saveField("issuedAt", value);
                  }}
                  placeholder="Add issue date"
                />
              </AccountRow>
              <AccountRow label="Due">
                <InlineDatePicker
                  value={dueDate}
                  onChange={(value) => {
                    setDueDate(value);
                    saveField("dueAt", value);
                  }}
                  placeholder="Add due date"
                />
              </AccountRow>
              <AccountRow label="Paid date">
                <InlineDatePicker
                  value={paidDate}
                  onChange={(value) => {
                    setPaidDate(value);
                    saveField("paidAt", value);
                  }}
                  placeholder="Add paid date"
                />
              </AccountRow>
              {billing.recurrenceLabel ? (
                <AccountRow label="Recurrence">{billing.recurrenceLabel}</AccountRow>
              ) : null}
            </dl>
          </div>
        </div>
      </MemoryOverviewSection>

      <BillingLineItemsSection billing={billing} />

      <MemoryOverviewSection title="Tags" variant="heading">
        <TagEditor entityType="billing" entityId={billing.id} scope="billing" />
      </MemoryOverviewSection>

      <TrustRow
        source={billing.source}
        lastUpdatedAt={billing.updatedAt ?? new Date().toISOString()}
        entityName={`${isPayable ? "Bill" : "Invoice"} ${billing.number}`}
      />
    </div>
  );
}
