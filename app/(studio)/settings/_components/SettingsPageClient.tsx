"use client"

import { AccountSection } from "./sections/AccountSection"
import { NotificationsSection } from "./sections/NotificationsSection"
import { IntegrationsSection } from "./sections/IntegrationsSection"
import { BillingSection } from "./sections/BillingSection"
import { StudioProfileSection } from "./sections/StudioProfileSection"
import { StudioBrandSection } from "./sections/StudioBrandSection"
import { StudioVoiceSection } from "./sections/StudioVoiceSection"
import { StudioServicesSection } from "./sections/StudioServicesSection"
import { StudioTemplatesSection } from "./sections/StudioTemplatesSection"
import { StudioTagsSection } from "./sections/StudioTagsSection"
import { StudioTeamSection } from "./sections/StudioTeamSection"
import { StudioClientBillingSection } from "./sections/StudioClientBillingSection"
import { StudioDomainsSection } from "./sections/StudioDomainsSection"
import { StudioPortfolioSection } from "./sections/StudioPortfolioSection"
import { StudioWorkTagsSection } from "./sections/StudioWorkTagsSection"
import { StudioPortalSection } from "./sections/StudioPortalSection"
import { StudioPaymentsSection } from "./sections/StudioPaymentsSection"

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
    google?: {
      connected: boolean
      email?: string
      studioId?: string
    }
    calcom?: {
      connected: boolean
      username?: string
    }
    fireflies?: {
      connected: boolean
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
      {section === "portfolio" && <StudioPortfolioSection />}
      {section === "brand" && <StudioBrandSection />}
      {section === "voice" && <StudioVoiceSection />}
      {section === "services" && <StudioServicesSection />}
      {section === "templates" && <StudioTemplatesSection />}
      {section === "client-tags" && <StudioTagsSection />}
      {section === "work-tags" && <StudioWorkTagsSection />}
      {section === "team" && <StudioTeamSection />}
      {section === "clients" && (
        <StudioClientBillingSection
          calcomConnected={integrations?.calcom?.connected ?? false}
          calcomUsername={integrations?.calcom?.username}
        />
      )}
      {section === "domains" && <StudioDomainsSection />}
      {section === "bridge" && <StudioPortalSection />}
      {section === "payments" && <StudioPaymentsSection />}

      {/* Placeholder for other sections */}
      {!["preferences", "notifications", "integrations", "billing", "profile", "portfolio", "brand", "voice", "services", "templates", "client-tags", "work-tags", "team", "clients", "domains", "bridge", "payments"].includes(section) && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-muted-foreground">
          <p className="text-lg font-medium">{section.charAt(0).toUpperCase() + section.slice(1)}</p>
          <p className="text-sm">Coming soon</p>
        </div>
      )}
    </>
  )
}
