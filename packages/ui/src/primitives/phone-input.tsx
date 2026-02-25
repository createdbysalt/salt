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

export interface PhoneInputProps
  extends Omit<
    React.ComponentProps<typeof PhoneInputPrimitive>,
    "onChange" | "value"
  > {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
}

export function PhoneInput({
  className,
  value,
  onChange,
  onBlur,
  defaultCountry = "US",
  ...props
}: PhoneInputProps & { defaultCountry?: Country }) {
  const handleChange = (newValue: Value) => {
    onChange?.(newValue || undefined);
  };

  return (
    <PhoneInputPrimitive
      international
      defaultCountry={defaultCountry}
      flags={flags}
      value={value as Value}
      onChange={handleChange}
      onBlur={onBlur}
      countrySelectComponent={CountrySelect}
      inputComponent={PhoneInputField}
      className={cn("flex gap-1.5", className)}
      {...props}
    />
  );
}

// Custom input field styled like shadcn Input
const PhoneInputField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="tel"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        className
      )}
      {...props}
    />
  );
});
PhoneInputField.displayName = "PhoneInputField";

// Custom country select dropdown
// react-phone-number-input passes options as { value: Country, label: string }[]
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
  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as Country);
  };

  const FlagComponent = value ? flags[value] : null;

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-sm",
          "focus-within:ring-1 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {FlagComponent && (
          <span className="flex h-4 w-5 overflow-hidden rounded-[2px]">
            <FlagComponent title={value} />
          </span>
        )}
        <span className="text-sm tabular-nums">
          {value ? `+${getCountryCallingCode(value)}` : ""}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </div>
      <select
        disabled={disabled}
        value={value || ""}
        onChange={handleSelect}
        className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value="">Select country</option>
        {options
          .filter((option) => option.value) // Filter out empty/International option
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
    </div>
  );
}
