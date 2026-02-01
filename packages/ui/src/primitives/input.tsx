import * as React from "react"

import { cn } from "@repo/utils"

/**
 * Input component for text entry.
 * Follows Linear's design system with 8px border-radius and smooth focus transitions.
 *
 * @example Basic input
 * ```tsx
 * <Input placeholder="Enter email" />
 * ```
 *
 * @example With label (use Field component)
 * ```tsx
 * <Field>
 *   <Label>Email</Label>
 *   <Input type="email" placeholder="you@example.com" />
 * </Field>
 * ```
 *
 * @example Search input
 * ```tsx
 * <Input type="search" placeholder="Search..." className="pl-9" />
 * ```
 */
function Input({
  className,
  type,
  size = "default",
  ...props
}: React.ComponentProps<"input"> & {
  size?: "default" | "sm"
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        // Linear-style: 8px radius, subtle background, smooth transitions
        "rounded-[8px] border border-border bg-background/50",
        "text-[15px] text-foreground placeholder:text-muted-foreground",
        // Focus states with Linear's exact ring
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "focus-visible:bg-background",
        // Error states
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-[3px]",
        // Linear transition timing
        "transition-[border-color,background-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        // Layout & sizing
        "h-10 px-3 py-2 w-full min-w-0 outline-none",
        // Size variant
        "data-[size=sm]:h-8 data-[size=sm]:text-[13px] data-[size=sm]:px-2.5",
        // File input styling
        "file:h-7 file:text-sm file:font-medium file:text-foreground",
        "file:inline-flex file:border-0 file:bg-transparent",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
