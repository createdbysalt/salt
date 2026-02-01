"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@repo/utils"
import { Button } from "./button"

/**
 * Dialog component for modal content.
 * Follows Linear's design system with smooth backdrop blur and spring animations.
 *
 * @example Basic dialog
 * ```tsx
 * <Dialog>
 *   <DialogTrigger asChild>
 *     <Button>Open Dialog</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Edit Profile</DialogTitle>
 *       <DialogDescription>Make changes to your profile here.</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <Button>Save changes</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // Linear-style overlay: subtle black with backdrop blur
        "bg-black/60 supports-backdrop-filter:backdrop-blur-sm",
        "fixed inset-0 isolate z-50",
        // Smooth fade animation
        "data-open:animate-in data-closed:animate-out",
        "data-closed:fade-out-0 data-open:fade-in-0",
        "duration-[200ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "default",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Dialog size: default (448px), sm (384px), lg (512px), xl (640px) */
  size?: "sm" | "default" | "lg" | "xl"
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          // Linear-style dialog: 16px radius, subtle border, shadow
          "bg-background border border-border rounded-[16px] shadow-2xl",
          "ring-foreground/5 ring-1",
          // Layout
          "grid gap-6 p-6 text-sm",
          "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          // Width based on size
          "w-full max-w-[calc(100%-2rem)]",
          "data-[size=sm]:sm:max-w-[384px]",
          "data-[size=default]:sm:max-w-[448px]",
          "data-[size=lg]:sm:max-w-[512px]",
          "data-[size=xl]:sm:max-w-[640px]",
          // Linear animation: smooth scale and fade
          "data-open:animate-in data-closed:animate-out",
          "data-closed:fade-out-0 data-open:fade-in-0",
          "data-closed:zoom-out-[0.98] data-open:zoom-in-[0.98]",
          "data-closed:slide-out-to-top-[2%] data-open:slide-in-from-top-[2%]",
          "data-open:duration-[200ms] data-closed:duration-[150ms]",
          "ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" className="absolute top-4 right-4" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("gap-2 flex flex-col", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "gap-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
