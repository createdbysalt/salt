"use client"

import { useRouter } from "next/navigation"
import { SETTINGS_MODAL_BACKDROP_CLASS } from "./settings-modal-shell"

export function SettingsRouteBackdrop() {
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label="Close settings"
      onClick={() => router.back()}
      className={SETTINGS_MODAL_BACKDROP_CLASS}
    />
  )
}
