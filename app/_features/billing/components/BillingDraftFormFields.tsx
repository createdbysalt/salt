"use client";

import { DatePicker, Input, parseIsoDate, toIsoDate } from "@repo/ui";
import type { BillingRecordDraft } from "../actions/billing-record-draft";

export type BillingDraftFormValues = {
  number: string;
  partyName: string;
  amount: string;
  dueDate: string;
  description: string;
};

export function draftToFormValues(draft: BillingRecordDraft): BillingDraftFormValues {
  return {
    number: draft.number,
    partyName:
      draft.direction === "receivable"
        ? (draft.org?.name ?? draft.billTo?.name ?? "")
        : (draft.vendorLabel ?? draft.payTo?.name ?? ""),
    amount: String((draft.amountCents / 100).toFixed(2)),
    dueDate: draft.dueAt.slice(0, 10),
    description: draft.lineItems[0]?.description ?? "",
  };
}

export function isoToDateValue(value: string): string {
  return value.slice(0, 10);
}

export function dateValueToIso(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return date.toISOString();
}

export function formValuesToDraft(
  draft: BillingRecordDraft,
  values: BillingDraftFormValues,
): BillingRecordDraft {
  const amountCents = Math.round(Number(values.amount || 0) * 100);

  return {
    ...draft,
    number: values.number,
    amountCents,
    dueAt: dateValueToIso(values.dueDate),
    ...(draft.direction === "receivable"
      ? { org: { id: draft.org?.id ?? "pending", name: values.partyName } }
      : { vendorLabel: values.partyName }),
    lineItems: [{ description: values.description, amountCents }],
  };
}

type BillingDraftFormFieldsProps = {
  draft: BillingRecordDraft;
  values: BillingDraftFormValues;
  onChange: (values: BillingDraftFormValues) => void;
  compact?: boolean;
};

export function BillingDraftFormFields({
  draft,
  values,
  onChange,
  compact = false,
}: BillingDraftFormFieldsProps) {
  const fieldClass = compact ? "space-y-1 text-xs" : "space-y-1.5 text-sm";
  const inputClass = compact ? "h-8 text-xs" : undefined;

  return (
    <div className="space-y-3">
      <label className={`block ${fieldClass}`}>
        <span className="font-medium text-foreground">Number</span>
        <Input
          className={inputClass}
          value={values.number}
          onChange={(event) => onChange({ ...values, number: event.target.value })}
        />
      </label>

      <label className={`block ${fieldClass}`}>
        <span className="font-medium text-foreground">
          {draft.direction === "receivable" ? "Customer" : "Vendor"}
        </span>
        <Input
          className={inputClass}
          value={values.partyName}
          onChange={(event) => onChange({ ...values, partyName: event.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={`block ${fieldClass}`}>
          <span className="font-medium text-foreground">Amount</span>
          <Input
            className={inputClass}
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => onChange({ ...values, amount: event.target.value })}
          />
        </label>
        <label className={`block ${fieldClass}`}>
          <span className="font-medium text-foreground">Due date</span>
          <DatePicker
            className={inputClass}
            value={parseIsoDate(values.dueDate)}
            onChange={(date) =>
              onChange({ ...values, dueDate: date ? toIsoDate(date) : "" })
            }
          />
        </label>
      </div>

      <label className={`block ${fieldClass}`}>
        <span className="font-medium text-foreground">Description</span>
        <Input
          className={inputClass}
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </label>
    </div>
  );
}
