import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"

import { cn } from "@repo/utils"

/**
 * Button component for user interactions.
 * Follows Linear's design system with precise easing and timing.
 *
 * @example Primary button (main CTA)
 * ```tsx
 * <Button>Get started</Button>
 * ```
 *
 * @example With loading state
 * ```tsx
 * <Button loading>Submitting...</Button>
 * ```
 *
 * @example Destructive action (delete, remove)
 * ```tsx
 * <Button variant="destructive">Delete project</Button>
 * ```
 *
 * @example As Next.js Link
 * ```tsx
 * <Button asChild>
 *   <Link href="/dashboard">Go to Dashboard</Link>
 * </Button>
 * ```
 */
const buttonVariants = cva(
  // Base styles: Linear's exact easing curve and timing
  // Font weight: 500 (not 510) - extracted from Linear app Jan 2026
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-[10px] border border-transparent bg-clip-padding text-[15px] font-[500] focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[color,background-color,border-color,box-shadow,filter,transform] duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:scale-[0.97] hover:brightness-110 active:brightness-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        /** Primary action button - use for main CTAs (one per view) */
        default: "bg-primary text-primary-foreground shadow-[rgba(0,0,0,0)_0px_8px_2px_0px,rgba(0,0,0,0.01)_0px_5px_2px_0px,rgba(0,0,0,0.04)_0px_3px_2px_0px,rgba(0,0,0,0.07)_0px_1px_1px_0px,rgba(0,0,0,0.08)_0px_0px_1px_0px]",
        /** Outlined button - secondary emphasis with visible border */
        outline: "border-border bg-transparent hover:bg-muted/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        /** Secondary button - lower emphasis actions */
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        /** Ghost button - minimal emphasis, for navigation or tertiary actions */
        ghost: "text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:hover:bg-muted/30 aria-expanded:bg-muted aria-expanded:text-foreground duration-[100ms]",
        /** Destructive button - for irreversible actions (delete, remove permanently) */
        destructive: "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        /** Link button - text-only, appears as inline link */
        link: "text-primary underline-offset-4 hover:underline hover:brightness-100",
      },
      size: {
        /** Default size: 40px height (Linear's primary button) */
        default: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        /** Extra small: 24px height */
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3 rounded-[4px]",
        /** Small: 32px height (Linear's secondary button) */
        sm: "h-8 gap-1 px-3 text-[13px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 rounded-[8px]",
        /** Toolbar: 28px height (Linear's filter/toolbar buttons - exact from app) */
        toolbar: "h-7 gap-1 px-2.5 text-[13px] font-normal has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 rounded-[4px]",
        /** Large: 48px height */
        lg: "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        /** Icon-only button: 40px square */
        icon: "size-10",
        /** Icon-only extra small: 24px square */
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3 rounded-[4px]",
        /** Icon-only small: 32px square */
        "icon-sm": "size-8 rounded-[8px]",
        /** Icon-only toolbar: 28px square (Linear's toolbar icon buttons) */
        "icon-toolbar": "size-7 [&_svg:not([class*='size-'])]:size-3.5 rounded-[4px]",
        /** Icon-only large: 48px square */
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
