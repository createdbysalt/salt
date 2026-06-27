"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { RelationshipType } from "@/app/_lib/demo/people-demo-data";
import {
  AccountRow,
  InlineDatePicker,
  InlineEditableText,
  InlineMoney,
  InlineNumber,
  InlineSelect,
  ReadOnlyDerivedValue,
  RELATIONSHIP_OPTIONS,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { InlineSearchSelect } from "@/app/_features/memory/components/InlineSearchSelect";
import { CapabilityReadinessStrip } from "@/app/_features/memory/components/CapabilityReadinessStrip";
import { LifecycleTimeline } from "@/app/_features/memory/components/LifecycleTimeline";
import { OrgSearchCombobox } from "@/app/_features/memory/components/OrgSearchCombobox";
import { PersonSearchCombobox } from "@/app/_features/memory/components/PersonSearchCombobox";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { TrustRow } from "@/app/_features/memory/components/TrustRow";
import { getEntityReadiness } from "@/app/_features/memory/capabilities/readiness";
import { correctWorkProfileField } from "@/app/_features/work/actions/profile-fields";
import type {
  WorkBillingCycle,
  WorkDetailViewModel,
  WorkPaymentTerms,
  WorkPaymentType,
  WorkProfileFieldKey,
  WorkServiceRef,
  WorkType,
} from "@/app/_features/work/types";
import { computeFinalPrice, formatCurrencyCents } from "@/app/_features/work/utils/pricing";
import { WorkStageSelect } from "@/app/_features/work/components/WorkStageSelect";
import { getInitialStage, isValidStage } from "@/app/_features/work/utils/stages";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";

type WorkOverviewTabProps = {
  work: WorkDetailViewModel;
  workId: string;
  lifecycleEvents?: LifecycleEventDisplay[];
  worthAttention?: { reason: string } | null;
  availableServices?: WorkServiceRef[];
};

export function WorkOverviewTab({
  work,
  workId,
  lifecycleEvents = [],
  worthAttention = null,
  availableServices = [],
}: WorkOverviewTabProps) {
  const [relationship, setRelationship] = useState<RelationshipType>(
    work.org ? "Client" : "Unknown",
  );
  const [name, setName] = useState(work.title ?? "");
  const [workStatus, setWorkStatus] = useState(work.status);
  const [workType, setWorkType] = useState<WorkType | "">(work.workType ?? "");
  const [stage, setStage] = useState(work.stage ?? "");
  const [organization, setOrganization] = useState(work.org?.name ?? "");
  const primaryContact = work.connections.find((connection) => connection.type === "person");
  const [primaryContactName, setPrimaryContactName] = useState(primaryContact?.name ?? "");
  const initialBillingContact = work.connections.find((connection) => connection.id === work.billingContactId);
  const [billingContactId, setBillingContactId] = useState(work.billingContactId);
  const [billingContactName, setBillingContactName] = useState(initialBillingContact?.name ?? primaryContact?.name ?? "");
  const [serviceId, setServiceId] = useState(work.service?.id ?? "");
  const [contractValueCents, setContractValueCents] = useState(work.contractValueCents);
  const [finalPriceCents, setFinalPriceCents] = useState(work.finalPriceCents ?? work.contractValueCents);
  const [paymentType, setPaymentType] = useState<WorkPaymentType | "">(work.paymentType ?? "");
  const [paymentTerms, setPaymentTerms] = useState<WorkPaymentTerms | "">(work.paymentTerms ?? "net_30");
  const [currency, setCurrency] = useState(work.currency ?? "USD");
  const [hourlyRateCents, setHourlyRateCents] = useState(work.hourlyRateCents);
  const [hoursEstimate, setHoursEstimate] = useState(work.hoursEstimate);
  const [retainerMrrCents, setRetainerMrrCents] = useState(work.retainerMrrCents);
  const [startDate, setStartDate] = useState(work.startDate);
  const [deadline, setDeadline] = useState(work.deadline);
  const [renewalDate, setRenewalDate] = useState(work.renewalDate);
  const [billingCycle, setBillingCycle] = useState<WorkBillingCycle | "">(work.billingCycle ?? "");
  const [poNumber, setPoNumber] = useState(work.poNumber ?? "");
  const [estimatedTimeline, setEstimatedTimeline] = useState(work.estimatedTimeline ?? "");
  const [discountPercent, setDiscountPercent] = useState(work.discountPercent);
  const [discountAmountCents, setDiscountAmountCents] = useState(work.discountAmountCents);
  const [discountReason, setDiscountReason] = useState(work.discountReason ?? "");
  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Renewing", label: "Renewing" },
    { value: "Stalled", label: "Stalled" },
    { value: "Wrapping", label: "Wrapping" },
  ] as const;
  const serviceOptions = [
    { value: "", label: "Custom (one-off)" },
    ...availableServices.map((service) => ({ value: service.id, label: service.name })),
  ] as const;
  const usingFlatDiscount = discountAmountCents != null;
  const usingPercentDiscount = discountPercent != null && !usingFlatDiscount;
  const workTypeOptions = [
    { value: "", label: "Add type" },
    { value: "project", label: "Project" },
    { value: "retainer", label: "Retainer" },
    { value: "hourly", label: "Hourly" },
    { value: "proposal", label: "Proposal" },
    { value: "quick", label: "Quick" },
    { value: "event", label: "Event" },
  ] as const;
  const paymentTypeOptions = [
    { value: "", label: "Add payment type" },
    { value: "fixed", label: "Fixed" },
    { value: "retainer", label: "Retainer" },
    { value: "hourly", label: "Hourly" },
    { value: "milestone", label: "Milestone" },
  ] as const;
  const paymentTermsOptions = [
    { value: "due_on_receipt", label: "Due on receipt" },
    { value: "net_15", label: "Net 15" },
    { value: "net_30", label: "Net 30" },
    { value: "net_60", label: "Net 60" },
  ] as const;
  const currencyOptions = [
    { value: "USD", label: "USD" },
    { value: "CAD", label: "CAD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
    { value: "AUD", label: "AUD" },
  ] as const;
  const billingCycleOptions = [
    { value: "", label: "Add cycle" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" },
  ] as const;

  async function saveWorkField(field: WorkProfileFieldKey, value: string | number | null) {
    const result = await correctWorkProfileField({
      workId,
      field,
      value: value == null ? "" : String(value),
    });
    if (!result.ok) {
      toast.error(result.message);
    }
  }

  function workStatusToDb(value: typeof workStatus): string {
    if (value === "Stalled") return "on_hold";
    if (value === "Wrapping") return "completed";
    if (value === "Renewing") return "signed";
    return "active";
  }

  function currentDiscountInput() {
    return discountAmountCents != null
      ? { type: "amount" as const, amountCents: discountAmountCents }
      : { type: "percent" as const, percent: discountPercent };
  }

  async function handleServiceChange(nextServiceId: string) {
    setServiceId(nextServiceId);
    await saveWorkField("service_id", nextServiceId);

    const service = availableServices.find((item) => item.id === nextServiceId);
    if (!service) return;

    if (service.basePriceCents != null) {
      const nextFinal = computeFinalPrice(service.basePriceCents, currentDiscountInput());
      setContractValueCents(service.basePriceCents);
      setFinalPriceCents(nextFinal);
      await saveWorkField("contract_value_cents", service.basePriceCents);
      await saveWorkField("final_price_cents", nextFinal);
    }

    if (service.typicalTimeline) {
      setEstimatedTimeline(service.typicalTimeline);
      await saveWorkField("estimated_timeline", service.typicalTimeline);
    }

    setCurrency(service.currency);
    await saveWorkField("currency", service.currency);
  }

  async function handleContractValueChange(value: number | null) {
    const nextFinal = computeFinalPrice(value, currentDiscountInput());
    setContractValueCents(value);
    setFinalPriceCents(nextFinal);
    await saveWorkField("contract_value_cents", value);
  }

  async function handleDiscountPercentChange(value: number | null) {
    const nextFinal = computeFinalPrice(contractValueCents, { type: "percent", percent: value });
    setDiscountPercent(value);
    setDiscountAmountCents(null);
    setFinalPriceCents(nextFinal);
    await saveWorkField("discount_percent", value);
    await saveWorkField("discount_amount_cents", null);
  }

  async function handleDiscountAmountChange(value: number | null) {
    const nextFinal = computeFinalPrice(contractValueCents, { type: "amount", amountCents: value });
    setDiscountAmountCents(value);
    setDiscountPercent(null);
    setFinalPriceCents(nextFinal);
    await saveWorkField("discount_amount_cents", value);
    await saveWorkField("discount_percent", null);
  }

  async function handleWorkTypeChange(nextWorkType: WorkType | "") {
    setWorkType(nextWorkType);
    await saveWorkField("work_type", nextWorkType);

    if (!nextWorkType) {
      if (stage) {
        setStage("");
        await saveWorkField("stage", "");
      }
      return;
    }

    if (!stage || !isValidStage(nextWorkType, stage)) {
      const nextStage = getInitialStage(nextWorkType);
      setStage(nextStage);
      await saveWorkField("stage", nextStage);
    }
  }

  async function handleStageChange(nextStage: string) {
    setStage(nextStage);
    await saveWorkField("stage", nextStage);
  }

  async function handleBillingContactChange(nextName: string) {
    setBillingContactName(nextName);
    const person = work.connections.find((connection) => connection.type === "person" && connection.name === nextName);
    setBillingContactId(person?.id ?? null);
    await saveWorkField("billing_contact_id", person?.id ?? null);
  }

  const showRetainerFields =
    workType === "retainer" || paymentType === "retainer" || retainerMrrCents != null || billingCycle !== "";
  const showHourlyFields =
    workType === "hourly" || paymentType === "hourly" || hourlyRateCents != null || hoursEstimate != null;
  const showRenewalField = showRetainerFields || renewalDate != null;

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt variant="heading">
        <p className="text-sm leading-relaxed text-foreground/80">{work.summary}</p>
      </MemoryOverviewSection>

      {worthAttention && (
        <MemoryOverviewSection title="Worth attention" salt variant="heading">
          <p className="text-sm leading-relaxed text-foreground/80">{worthAttention.reason}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Details" variant="heading">
        <CapabilityReadinessStrip
          readiness={getEntityReadiness("work", {
            serviceId,
            workType,
            primaryContactName,
            billingContactId,
            paymentTerms,
            currency,
            contractValueCents,
            finalPriceCents,
            retainerMrrCents,
            renewalDate,
            billingCycle,
          })}
        />

        <div className="space-y-5">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Work
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Name">
                <InlineEditableText
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    saveWorkField("name", value);
                  }}
                  placeholder="Add name"
                />
              </AccountRow>
              <AccountRow label="Status">
                <InlineSelect
                  value={workStatus}
                  onChange={(value) => {
                    setWorkStatus(value);
                    saveWorkField("status", workStatusToDb(value));
                  }}
                  options={statusOptions}
                />
              </AccountRow>
              <AccountRow label="Work type">
                <InlineSelect
                  value={workType}
                  onChange={handleWorkTypeChange}
                  options={workTypeOptions}
                />
              </AccountRow>
              <AccountRow label="Service">
                <InlineSearchSelect
                  value={serviceId}
                  onChange={handleServiceChange}
                  options={serviceOptions}
                  placeholder="Custom (one-off)"
                  searchPlaceholder="Search services..."
                  emptyMessage="No services found."
                />
              </AccountRow>
              <AccountRow label="Stage">
                <WorkStageSelect
                  workType={workType}
                  value={stage}
                  onChange={handleStageChange}
                />
              </AccountRow>
              <AccountRow label="Timeline">
                <InlineEditableText
                  value={estimatedTimeline}
                  onChange={(value) => {
                    setEstimatedTimeline(value);
                    saveWorkField("estimated_timeline", value);
                  }}
                  placeholder="Add timeline"
                />
              </AccountRow>
            </dl>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Client
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Organization">
                <OrgSearchCombobox
                  value={organization}
                  onChange={setOrganization}
                  placeholder="Search organizations..."
                  inline
                />
              </AccountRow>
              <AccountRow label="Relationship">
                <InlineSelect
                  value={relationship}
                  onChange={setRelationship}
                  options={RELATIONSHIP_OPTIONS}
                />
              </AccountRow>
              <AccountRow label="Primary contact">
                <PersonSearchCombobox
                  value={primaryContactName}
                  onChange={setPrimaryContactName}
                  placeholder="Search people..."
                  inline
                />
              </AccountRow>
              <AccountRow label="Billing contact">
                <PersonSearchCombobox
                  value={billingContactName}
                  onChange={handleBillingContactChange}
                  placeholder="Search people..."
                  inline
                />
              </AccountRow>
            </dl>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Pricing
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Contract value">
                <InlineMoney
                  valueCents={contractValueCents}
                  onChange={handleContractValueChange}
                  currency={currency}
                />
              </AccountRow>
              <AccountRow label="Discount %">
                <InlineNumber
                  value={usingFlatDiscount ? null : discountPercent}
                  onChange={handleDiscountPercentChange}
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder={usingFlatDiscount ? "Using flat discount" : "Add percent"}
                />
              </AccountRow>
              <AccountRow label="Discount amount">
                <InlineMoney
                  valueCents={usingPercentDiscount ? null : discountAmountCents}
                  onChange={handleDiscountAmountChange}
                  currency={currency}
                  placeholder={usingPercentDiscount ? "Using % discount" : "Add discount"}
                />
              </AccountRow>
              <AccountRow label="Final price">
                <ReadOnlyDerivedValue empty={finalPriceCents == null}>
                  {formatCurrencyCents(finalPriceCents, currency)}
                </ReadOnlyDerivedValue>
              </AccountRow>
              <AccountRow label="Discount reason">
                <InlineEditableText
                  value={discountReason}
                  onChange={(value) => {
                    setDiscountReason(value);
                    saveWorkField("discount_reason", value);
                  }}
                  placeholder="Add reason"
                />
              </AccountRow>
            </dl>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Payment
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Payment type">
                <InlineSelect
                  value={paymentType}
                  onChange={(value) => {
                    setPaymentType(value);
                    saveWorkField("payment_type", value);
                  }}
                  options={paymentTypeOptions}
                />
              </AccountRow>
              <AccountRow label="Payment terms">
                <InlineSelect
                  value={paymentTerms}
                  onChange={(value) => {
                    setPaymentTerms(value);
                    saveWorkField("payment_terms", value);
                  }}
                  options={paymentTermsOptions}
                />
              </AccountRow>
              <AccountRow label="Currency">
                <InlineSelect
                  value={currency}
                  onChange={(value) => {
                    setCurrency(value);
                    saveWorkField("currency", value);
                  }}
                  options={currencyOptions}
                />
              </AccountRow>
              <AccountRow label="PO number">
                <InlineEditableText
                  value={poNumber}
                  onChange={(value) => {
                    setPoNumber(value);
                    saveWorkField("po_number", value);
                  }}
                  placeholder="Add PO"
                />
              </AccountRow>
            </dl>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Schedule
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Started">
                <InlineDatePicker
                  value={startDate}
                  onChange={(value) => {
                    setStartDate(value);
                    saveWorkField("start_date", value);
                  }}
                  placeholder="Add start date"
                />
              </AccountRow>
              <AccountRow label="Deadline">
                <InlineDatePicker
                  value={deadline}
                  onChange={(value) => {
                    setDeadline(value);
                    saveWorkField("deadline", value);
                  }}
                  placeholder="Add deadline"
                />
              </AccountRow>
              {showRenewalField ? (
                <AccountRow label="Renewal">
                  <InlineDatePicker
                    value={renewalDate}
                    onChange={(value) => {
                      setRenewalDate(value);
                      saveWorkField("renewal_date", value);
                    }}
                    placeholder="Add renewal"
                  />
                </AccountRow>
              ) : null}
            </dl>
          </div>

          {showRetainerFields ? (
            <div className="border-t border-border/50 pt-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Retainer
              </p>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <AccountRow label="Retainer MRR">
                  <InlineMoney
                    valueCents={retainerMrrCents}
                    onChange={(value) => {
                      setRetainerMrrCents(value);
                      saveWorkField("retainer_mrr_cents", value);
                    }}
                    currency={currency}
                    placeholder="Add MRR"
                  />
                </AccountRow>
                <AccountRow label="Billing cycle">
                  <InlineSelect
                    value={billingCycle}
                    onChange={(value) => {
                      setBillingCycle(value);
                      saveWorkField("billing_cycle", value);
                    }}
                    options={billingCycleOptions}
                  />
                </AccountRow>
              </dl>
            </div>
          ) : null}

          {showHourlyFields ? (
            <div className="border-t border-border/50 pt-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Hourly
              </p>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <AccountRow label="Hourly rate">
                  <InlineMoney
                    valueCents={hourlyRateCents}
                    onChange={(value) => {
                      setHourlyRateCents(value);
                      saveWorkField("hourly_rate_cents", value);
                    }}
                    currency={currency}
                    placeholder="Add rate"
                  />
                </AccountRow>
                <AccountRow label="Hours estimate">
                  <InlineNumber
                    value={hoursEstimate}
                    onChange={(value) => {
                      setHoursEstimate(value);
                      saveWorkField("hours_estimate", value);
                    }}
                    min={0}
                    step="0.25"
                    placeholder="Add hours"
                  />
                </AccountRow>
              </dl>
            </div>
          ) : null}
        </div>
      </MemoryOverviewSection>

      {work.description ? (
        <MemoryOverviewSection title="Description">
          <p className="text-sm leading-relaxed text-foreground/80">{work.description}</p>
        </MemoryOverviewSection>
      ) : null}

      <MemoryOverviewSection title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {work.tags.length ? (
            work.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80">
                {tag}
              </span>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          )}
        </div>
      </MemoryOverviewSection>

      {lifecycleEvents.length > 0 && (
        <LifecycleTimeline events={lifecycleEvents} />
      )}

      <TrustRow source={work.source} lastUpdatedAt={work.lastActivityAt} entityName={work.title} />
    </div>
  );
}
