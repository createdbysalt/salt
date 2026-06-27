"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { InlineEditableText } from "./AccountFieldEditors";
import { cn } from "@repo/utils";

type AddressFields = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type CollapsibleAddressProps = {
  address: AddressFields;
  onChange: (field: keyof AddressFields, value: string) => void;
  taxId?: string;
  onTaxIdChange?: (value: string) => void;
  showTaxId?: boolean;
};

function formatAddressSummary(address: AddressFields): string | null {
  const parts: string[] = [];

  if (address.addressLine1) {
    parts.push(address.addressLine1);
  }

  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  if (cityState) {
    parts.push(cityState);
  }

  if (address.postalCode) {
    parts.push(address.postalCode);
  }

  if (address.country) {
    parts.push(address.country);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function CollapsibleAddress({
  address,
  onChange,
  taxId,
  onTaxIdChange,
  showTaxId = false,
}: CollapsibleAddressProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = formatAddressSummary(address);
  const hasAnyAddress = summary !== null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm transition hover:bg-muted/60"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <MapPin className="size-4 text-muted-foreground" />
        <span className={cn("flex-1", !hasAnyAddress && "italic text-muted-foreground/80")}>
          {hasAnyAddress ? summary : "Add address"}
        </span>
      </button>

      {expanded && (
        <div className="ml-6 grid gap-3 border-l border-border/50 pl-4 pt-1">
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
