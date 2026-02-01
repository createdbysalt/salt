"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@repo/utils"

/**
 * Checkbox component for boolean selections.
 * Follows Linear's design system with 4px border-radius and smooth check animation.
 *
 * @example Basic checkbox
 * ```tsx
 * <Checkbox />
 * ```
 *
 * @example With label
 * ```tsx
 * <Field>
 *   <div className="flex items-center gap-2">
 *     <Checkbox id="terms" />
 *     <Label htmlFor="terms">Accept terms and conditions</Label>
 *   </div>
 * </Field>
 * ```
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Linear-style: 4px radius (matches xs radius), subtle border
        "size-4 rounded-[4px] border border-border",
        "dark:bg-input/30",
        // Checked state
        "data-checked:bg-primary data-checked:text-primary-foreground",
        "dark:data-checked:bg-primary data-checked:border-primary",
        // Focus states
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // Error states
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-[3px]",
        "aria-invalid:aria-checked:border-primary",
        // Linear transition timing
        "transition-[background-color,border-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        // Layout
        "flex items-center justify-center",
        "peer relative shrink-0 outline-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        // Disabled states
        "group-has-disabled/field:opacity-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="[&>svg]:size-3.5 grid place-content-center text-current"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
