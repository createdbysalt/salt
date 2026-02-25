/**
 * Toast hook - now using Sonner
 *
 * Migration note: This hook previously used a custom toast implementation.
 * It now re-exports Sonner's toast function for compatibility.
 *
 * Usage:
 *   import { useToast, toast } from "@/app/_components/ui/use-toast"
 *
 *   // Using the toast function directly
 *   toast.success("Success message")
 *   toast.error("Error message")
 *   toast("Default message")
 *
 *   // Or using the hook (for consistency with old code)
 *   const { toast } = useToast()
 *   toast({ title: "Hello", description: "World" })
 */

import { toast as sonnerToast } from "sonner"

// Compatibility wrapper for old useToast API
type ToastOptions = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

function compatToast({ title, description, variant }: ToastOptions) {
  const message = title || description || ""
  const options = description && title ? { description } : undefined

  if (variant === "destructive") {
    sonnerToast.error(message, options)
  } else {
    sonnerToast(message, options)
  }
}

function useToast() {
  return {
    toast: compatToast,
    dismiss: sonnerToast.dismiss,
    toasts: [], // Sonner manages its own state
  }
}

export { useToast, sonnerToast as toast }
