"use client"

import { Package } from "lucide-react"
import { SettingsPage } from "../SettingsPage"

export function StudioServicesSection() {
  return (
    <SettingsPage title="Services">
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Package className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Service packages are coming soon. You&apos;ll be able to define your
            services with pricing, descriptions, and timelines.
          </p>
        </div>
      </div>
    </SettingsPage>
  )
}
