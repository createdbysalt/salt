"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export function SettingsCloseButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label="Close settings"
      onClick={() => router.back()}
      className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  )
}
