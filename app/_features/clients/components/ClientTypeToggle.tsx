"use client";

import { User, Building2 } from "lucide-react";
import { cn } from "@repo/utils";
import type { ClientType } from "./AddClientSheet";

// ============================================================================
// Types
// ============================================================================

interface ClientTypeToggleProps {
  value: ClientType;
  onChange: (type: ClientType) => void;
  className?: string;
}

interface TypeOption {
  type: ClientType;
  icon: React.ReactNode;
  label: string;
}

// ============================================================================
// Options
// ============================================================================

const typeOptions: TypeOption[] = [
  {
    type: "individual",
    icon: <User className="h-4 w-4" />,
    label: "Individual",
  },
  {
    type: "organization",
    icon: <Building2 className="h-4 w-4" />,
    label: "Company",
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * A segmented toggle for selecting between Individual and Organization client types.
 * Follows Linear-inspired design with smooth transitions and clear visual feedback.
 *
 * @example
 * ```tsx
 * <ClientTypeToggle
 *   value={clientType}
 *   onChange={setClientType}
 * />
 * ```
 */
export function ClientTypeToggle({
  value,
  onChange,
  className,
}: ClientTypeToggleProps) {
  return (
    <div
      className={cn(
        "flex p-1 rounded-[12px] bg-muted/30 border border-border",
        className
      )}
      role="radiogroup"
      aria-label="Client type"
    >
      {typeOptions.map((option) => {
        const isSelected = value === option.type;

        return (
          <button
            key={option.type}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.type)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2",
              "px-4 py-2.5 rounded-[8px]",
              "text-sm font-medium",
              "transition-all duration-160",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span
              className={cn(
                "transition-colors duration-160",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
