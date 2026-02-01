"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@repo/utils"

/**
 * Switch component for toggle controls.
 * Follows Linear's design system with smooth thumb transitions.
 *
 * @example Basic switch
 * ```tsx
 * <Switch />
 * ```
 *
 * @example With label
 * ```tsx
 * <Field>
 *   <div className="flex items-center gap-2">
 *     <Switch id="notifications" />
 *     <Label htmlFor="notifications">Enable notifications</Label>
 *   </div>
 * </Field>
 * ```
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // Linear-style: rounded track with smooth color transition
        "shrink-0 rounded-full border border-transparent",
        "data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80",
        // Sizing
        "data-[size=default]:h-[20px] data-[size=default]:w-[36px]",
        "data-[size=sm]:h-[16px] data-[size=sm]:w-[28px]",
        // Focus states
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-[3px]",
        // Linear transition timing
        "transition-[background-color,border-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        // Layout
        "peer group/switch relative inline-flex items-center outline-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        // Disabled
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Linear-style thumb with smooth slide
          "bg-background dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground",
          "rounded-full pointer-events-none block ring-0",
          // Sizing
          "group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          // Translate with margin for padding
          "group-data-[size=default]/switch:data-checked:translate-x-[16px]",
          "group-data-[size=sm]/switch:data-checked:translate-x-[12px]",
          "group-data-[size=default]/switch:data-unchecked:translate-x-[2px]",
          "group-data-[size=sm]/switch:data-unchecked:translate-x-[2px]",
          // Linear transition for thumb
          "transition-transform duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
