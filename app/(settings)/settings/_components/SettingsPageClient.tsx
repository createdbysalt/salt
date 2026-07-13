"use client"

import { AccountSection } from "./sections/AccountSection"
import { NotificationsSection } from "./sections/NotificationsSection"
import { BillingSection } from "./sections/BillingSection"
import { CaptureSection } from "./sections/CaptureSection"
import { MemorySection } from "./sections/MemorySection"
import { PlaysSection } from "./sections/PlaysSection"
import { SettingsPage } from "./SettingsPage"
import { SettingsSection } from "./SettingsSection"
import { SettingsCard } from "./SettingsCard"

interface SettingsPageClientProps {
  section: string
  workspaceId: string
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
  billing?: {
    subscription?: {
      tier: "none" | "starter" | "pro" | "max" | "enterprise"
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

const PLACEHOLDER_COPY: Record<string, { title: string; items: string[] }> = {
  privacy: {
    title: "Privacy",
    items: [
      "Data retention and deletion controls",
      "Connector-level read permissions",
      "AI memory and personalization controls",
    ],
  },
  usage: {
    title: "Usage",
    items: [
      "AI credit consumption by feature",
      "Connector sync activity",
      "Workspace usage thresholds",
    ],
  },
  business: {
    title: "Business",
    items: [
      "Workspace profile, brand, and voice defaults",
      "Service and offer taxonomy",
      "Team and domain controls when they become active",
    ],
  },
  plays: {
    title: "Plays",
    items: [
      "Approval defaults",
      "Playbook run preferences",
      "Automation boundaries for prepared work",
    ],
  },
  capture: {
    title: "Capture",
    items: [
      "Capture sources and routing rules",
      "Inbox triage preferences",
      "Meeting and context capture defaults",
    ],
  },
  memory: {
    title: "Memory",
    items: [
      "People and work tags",
      "Relationship and meeting defaults",
      "Business context Salt should remember",
    ],
  },
}

function PlaceholderSettingsSection({ section }: { section: string }) {
  const copy = PLACEHOLDER_COPY[section] ?? {
    title: section.charAt(0).toUpperCase() + section.slice(1),
    items: ["Settings for this area are not available yet."],
  }

  return (
    <SettingsPage title={copy.title}>
      <SettingsSection title="Planned controls">
        <SettingsCard>
          <div className="space-y-3 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              This tab is part of the new Salt settings structure. These controls will stay here once the underlying feature preferences are ready.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {copy.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/50" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  )
}

export function SettingsPageClient({ section, workspaceId, user, notificationPreferences, billing }: SettingsPageClientProps) {
  return (
    <>
      {section === "general" && (
        <AccountSection
          title="General"
          showProfile={false}
          showTheme
          showAccountActions={false}
          user={user}
        >
          <NotificationsSection embedded preferences={notificationPreferences} />
        </AccountSection>
      )}
      {section === "account" && <AccountSection user={user} />}
      {section === "billing" && (
        <BillingSection
          title="Billing"
          subscription={billing?.subscription}
          aiCredits={billing?.aiCredits}
          paymentMethod={billing?.paymentMethod}
          invoices={billing?.invoices}
        />
      )}
      {section === "memory" && <MemorySection />}
      {section === "plays" && <PlaysSection workspaceId={workspaceId} />}
      {section === "capture" && <CaptureSection workspaceId={workspaceId} />}
      {["privacy", "usage", "business"].includes(section) && (
        <PlaceholderSettingsSection section={section} />
      )}

      {!["general", "account", "billing", "privacy", "usage", "business", "plays", "capture", "memory"].includes(section) && (
        <PlaceholderSettingsSection section={section} />
      )}
    </>
  )
}
