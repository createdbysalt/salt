"use client"

import { Receipt } from "lucide-react"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"

export function WorkspacePaymentsSection() {
  return (
    <SettingsPage title="Payments">
      <SettingsSection
        title="Client Billing"
        description="Configure how you bill clients"
      >
        <SettingsCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Receipt className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Client billing settings including payment terms, currencies, and
              invoice customization.
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  )
}
