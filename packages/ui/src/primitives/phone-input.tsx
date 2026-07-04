"use client";

import * as React from "react";
import PhoneInputPrimitive, {
  type Country,
  type Value,
  getCountryCallingCode,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/utils";

type PhoneInputVariant = "default" | "inline";

const PhoneInputVariantContext = React.createContext<PhoneInputVariant>("default");

export interface PhoneInputProps
  extends Omit<
    React.ComponentProps<typeof PhoneInputPrimitive>,
    "onChange" | "value"
  > {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  variant?: PhoneInputVariant;
}

function normalizePhoneValue(value: string | undefined): Value | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) {
    return `+${value}` as Value;
  }
  return value as Value;
}

export function PhoneInput({
  className,
  value,
  onChange,
  onBlur,
  defaultCountry = "US",
  variant = "default",
  ...props
}: PhoneInputProps & { defaultCountry?: Country }) {
  const handleChange = (newValue: Value) => {
    onChange?.(newValue || undefined);
  };

  const normalizedValue = normalizePhoneValue(value);
  const isInline = variant === "inline";

  return (
    <PhoneInputVariantContext.Provider value={variant}>
      <PhoneInputPrimitive
        international={!isInline}
        defaultCountry={defaultCountry}
        flags={flags}
        value={normalizedValue}
        onChange={handleChange}
        onBlur={onBlur}
        countrySelectComponent={CountrySelect}
        inputComponent={PhoneInputField}
        className={cn(
          isInline
            ? "-mx-1 flex w-full min-w-0 items-center gap-1.5 border-b border-foreground/25 px-1 py-0.5 focus-within:border-foreground/60"
            : "flex gap-1.5",
          className,
        )}
        {...props}
      />
    </PhoneInputVariantContext.Provider>
  );
}

const PhoneInputField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  const variant = React.useContext(PhoneInputVariantContext);
  const isInline = variant === "inline";

  return (
    <input
      ref={ref}
      type="tel"
      className={cn(
        isInline
          ? "min-w-0 flex-1 border-l border-border/40 bg-transparent py-0.5 pl-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          : [
              "flex h-9 w-full border border-input bg-transparent px-3 py-1 text-base transition-colors",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "md:text-sm",
            ],
        className,
      )}
      {...props}
    />
  );
});
PhoneInputField.displayName = "PhoneInputField";

interface CountryOption {
  value: Country;
  label: string;
}

interface CountrySelectProps {
  disabled?: boolean;
  value: Country;
  onChange: (value: Country) => void;
  options: CountryOption[];
}

function CountrySelect({
  disabled,
  value,
  onChange,
  options,
}: CountrySelectProps) {
  const variant = React.useContext(PhoneInputVariantContext);
  const isInline = variant === "inline";

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as Country);
  };

  const FlagComponent = value ? flags[value] : null;

  return (
    <div className={cn("relative shrink-0", isInline && "rounded-md transition hover:bg-muted/40")}>
      <div
        className={cn(
          "flex items-center text-sm text-foreground",
          isInline
            ? "gap-1 py-0.5 pl-0.5 pr-1"
            : [
                "h-9 gap-1.5 border border-input bg-transparent px-2.5",
                "focus-within:ring-1 focus-within:ring-ring",
              ],
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {FlagComponent ? (
          <span className="flex h-3.5 w-[1.125rem] shrink-0 overflow-hidden rounded-[2px]">
            <FlagComponent title={value} />
          </span>
        ) : null}
        <span className="shrink-0 text-sm tabular-nums">
          {value ? `+${getCountryCallingCode(value)}` : "—"}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </div>
      <select
        disabled={disabled}
        value={value || ""}
        onChange={handleSelect}
        aria-label="Country code"
        className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        <option value="">Select country</option>
        {options
          .filter((option) => option.value)
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
    </div>
  );
}
