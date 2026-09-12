"use client"

import { SettingsSection } from "@/app/(settings)/settings/_components/SettingsSection"
import { SettingsCard } from "@/app/(settings)/settings/_components/SettingsCard"
import { ResetDemoButton } from "./ResetDemoButton"

/**
 * Demo-only settings panel. Rendered by SettingsPageClient when the signed-in
 * account is the demo user; invisible for every real account.
 */
export function DemoSettingsSection() {
  return (
    <SettingsSection
      title="Demo"
      description="Restore this workspace to the perfect demo state — fresh plays, briefing, meetings, and billing dated today."
    >
      <SettingsCard>
        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Wipes and re-seeds the workspace. Run it right before showing the product.
          </p>
          <ResetDemoButton />
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}
