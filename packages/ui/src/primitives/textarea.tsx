import * as React from "react"

import { cn } from "@repo/utils"

/**
 * Textarea component for multi-line text entry.
 * Follows Linear's design system with 10px border-radius and smooth focus transitions.
 *
 * @example Basic textarea
 * ```tsx
 * <Textarea placeholder="Enter description..." />
 * ```
 *
 * @example With rows specified
 * ```tsx
 * <Textarea rows={4} placeholder="Write a message..." />
 * ```
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Linear-style: 10px radius for larger inputs, subtle background
        "rounded-[10px] border border-border bg-background/50",
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
        "resize-none px-3 py-3 field-sizing-content min-h-20 w-full outline-none",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
