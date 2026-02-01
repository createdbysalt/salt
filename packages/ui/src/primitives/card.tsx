import * as React from "react"

import { cn } from "@repo/utils"

/**
 * Card component for grouping related content.
 * Follows Linear's design system with 16px border-radius and smooth hover transitions.
 *
 * @example Basic card
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Project Settings</CardTitle>
 *     <CardDescription>Manage your project configuration</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Card content goes here</p>
 *   </CardContent>
 * </Card>
 * ```
 *
 * @example Feature card (Linear-style with hover)
 * ```tsx
 * <Card className="card-linear">
 *   <CardContent>Interactive feature card</CardContent>
 * </Card>
 * ```
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        // Linear-style: 16px radius, subtle border, smooth transition
        "bg-card text-card-foreground border border-border rounded-[16px] shadow-sm",
        "group/card flex flex-col",
        "transition-[background-color,box-shadow] duration-[200ms] ease-out",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "gap-2 p-6 group-data-[size=sm]/card:p-4",
        "group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-medium", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "p-6 pt-0 group-data-[size=sm]/card:p-4 group-data-[size=sm]/card:pt-0",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "p-6 pt-0 group-data-[size=sm]/card:p-4 group-data-[size=sm]/card:pt-0 flex items-center",
        "[.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
