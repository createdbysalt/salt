"use client"

import { AccountSection } from "./sections/AccountSection"
import { NotificationsSection } from "./sections/NotificationsSection"
import { IntegrationsSection } from "./sections/IntegrationsSection"
import { BillingSection } from "./sections/BillingSection"
import { StudioProfileSection } from "./sections/StudioProfileSection"
import { StudioBrandSection } from "./sections/StudioBrandSection"
import { StudioServicesSection } from "./sections/StudioServicesSection"
import { StudioTemplatesSection } from "./sections/StudioTemplatesSection"
import { StudioTagsSection } from "./sections/StudioTagsSection"
import { StudioTeamSection } from "./sections/StudioTeamSection"
import { StudioClientBillingSection } from "./sections/StudioClientBillingSection"

interface SettingsPageClientProps {
  section: string
  user?: {
    email?: string
    firstName?: string
    lastName?: string
    avatarUrl?: string
  }
  notificationPreferences?: {
    batching: "immediate" | "hourly" | "daily"
    quietHoursEnabled: boolean
    quietHoursStart: string
    quietHoursEnd: string
  }
  integrations?: {
    stripe?: {
      connected: boolean
      accountId?: string
      status?: string
      chargesEnabled?: boolean
    }
    googleCalendar?: {
      connected: boolean
      email?: string
    }
    calcom?: {
      connected: boolean
      username?: string
    }
  }
  billing?: {
    subscription?: {
      tier: "none" | "solo" | "professional" | "studio" | "enterprise"
      status: string
      interval: "month" | "year"
      currentPeriodEnd?: string
      cancelAtPeriodEnd?: boolean
    }
    aiCredits?: {
      monthlyAllocation: number
      purchasedCredits: number
      usedThisMonth: number
      totalAvailable: number
    }
    paymentMethod?: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    }
    invoices?: {
      id: string
      date: string
      amount: number
      status: "paid" | "pending" | "failed"
      invoiceUrl?: string
    }[]
  }
}

export function SettingsPageClient({ section, user, notificationPreferences, integrations, billing }: SettingsPageClientProps) {
  return (
    <>
      {section === "preferences" && <AccountSection user={user} />}
      {section === "notifications" && <NotificationsSection preferences={notificationPreferences} />}
      {section === "integrations" && (
        <IntegrationsSection
          integrations={integrations}
        />
      )}
      {section === "billing" && (
        <BillingSection
          subscription={billing?.subscription}
          aiCredits={billing?.aiCredits}
          paymentMethod={billing?.paymentMethod}
          invoices={billing?.invoices}
        />
      )}

      {/* Studio Settings Sections */}
      {section === "profile" && <StudioProfileSection />}
      {section === "brand" && <StudioBrandSection />}
      {section === "services" && <StudioServicesSection />}
      {section === "templates" && <StudioTemplatesSection />}
      {section === "tags" && <StudioTagsSection />}
      {section === "team" && <StudioTeamSection />}
      {section === "client-billing" && <StudioClientBillingSection />}

      {/* Placeholder for other sections */}
      {!["preferences", "notifications", "integrations", "billing", "profile", "brand", "services", "templates", "tags", "team", "client-billing"].includes(section) && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-muted-foreground">
          <p className="text-lg font-medium">{section.charAt(0).toUpperCase() + section.slice(1)}</p>
          <p className="text-sm">Coming soon</p>
        </div>
      )}
    </>
  )
}
