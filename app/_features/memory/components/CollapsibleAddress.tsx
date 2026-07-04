"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { InlineEditableText } from "./AccountFieldEditors";
import { cn } from "@repo/utils";
import {
  formatAddressSummary,
  type MemoryAddressField,
  type MemoryAddressFields,
} from "@/app/_features/memory/utils/address-fields";

export type { MemoryAddressField, MemoryAddressFields };

type CollapsibleAddressProps = {
  address: MemoryAddressFields;
  onChange: (field: MemoryAddressField, value: string) => void;
  taxId?: string;
  onTaxIdChange?: (value: string) => void;
  showTaxId?: boolean;
  /** Fits inside AccountRow — no map pin, aligned with other detail fields */
  embedded?: boolean;
};

export { formatAddressSummary };

export function CollapsibleAddress({
  address,
  onChange,
  taxId,
  onTaxIdChange,
  showTaxId = false,
  embedded = false,
}: CollapsibleAddressProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = formatAddressSummary(address);
  const hasAnyAddress = summary !== null;

  return (
    <div className={cn("space-y-2", embedded && "min-w-0")}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-sm transition hover:bg-muted/40",
          embedded && "-mx-1",
        )}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {!embedded ? <MapPin className="size-4 shrink-0 text-muted-foreground" /> : null}
        <span className={cn("min-w-0 flex-1 truncate", !hasAnyAddress && "text-muted-foreground")}>
          {hasAnyAddress ? summary : "Add address"}
        </span>
      </button>

      {expanded && (
        <div
          className={cn(
            "grid gap-3 pt-1",
            embedded ? "pl-5" : "ml-6 border-l border-border/50 pl-4",
          )}
        >
          <AddressField
            label="Street address"
            value={address.addressLine1}
            onChange={(v) => onChange("addressLine1", v)}
            placeholder="123 Main St"
          />
          <AddressField
            label="Line 2"
            value={address.addressLine2}
            onChange={(v) => onChange("addressLine2", v)}
            placeholder="Apt, suite, etc."
          />
          <div className="grid grid-cols-2 gap-3">
            <AddressField
              label="City"
              value={address.city}
              onChange={(v) => onChange("city", v)}
              placeholder="City"
            />
            <AddressField
              label="State"
              value={address.state}
              onChange={(v) => onChange("state", v)}
              placeholder="State/Province"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AddressField
              label="Postal code"
              value={address.postalCode}
              onChange={(v) => onChange("postalCode", v)}
              placeholder="ZIP/Postal"
            />
            <AddressField
              label="Country"
              value={address.country}
              onChange={(v) => onChange("country", v)}
              placeholder="Country"
            />
          </div>
          {showTaxId && onTaxIdChange && (
            <AddressField
              label="Tax ID"
              value={taxId ?? ""}
              onChange={onTaxIdChange}
              placeholder="VAT/Tax number"
            />
          )}
        </div>
      )}
    </div>
  );
}

function AddressField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <InlineEditableText
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}
