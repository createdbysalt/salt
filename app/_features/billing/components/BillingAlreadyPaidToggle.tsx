"use client";

import { alreadyPaidIntakeLabel } from "@/app/_features/billing/utils/payment-display";

type BillingAlreadyPaidToggleProps = {
  direction: "receivable" | "payable";
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function BillingAlreadyPaidToggle({
  direction,
  checked,
  onChange,
  disabled = false,
}: BillingAlreadyPaidToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-foreground"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {alreadyPaidIntakeLabel(direction)}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {direction === "receivable"
            ? "Use this when the client has already paid and you are filing the invoice for your records."
            : "Use this for receipts, subscription confirmations, or bills you have already paid."}
        </span>
      </span>
    </label>
  );
}
