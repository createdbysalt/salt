"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@repo/utils"

/**
 * Tooltip component for contextual information.
 * Follows Linear's design system with inverted colors and smooth animations.
 *
 * @example Basic tooltip
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger asChild>
 *     <Button variant="ghost" size="icon">
 *       <InfoIcon />
 *     </Button>
 *   </TooltipTrigger>
 *   <TooltipContent>Helpful information</TooltipContent>
 * </Tooltip>
 * ```
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // Linear-style: 8px radius, inverted colors, subtle shadow
          "rounded-[8px] px-2.5 py-1.5 text-xs font-medium",
          "bg-foreground text-background shadow-md",
          // Layout
          "z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin)",
          "**:data-[slot=kbd]:rounded-[4px]",
          // Animations with Linear timing
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="size-2 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground z-50" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
