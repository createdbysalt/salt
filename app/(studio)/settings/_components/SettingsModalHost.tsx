"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { createClient } from "@/app/_lib/supabase/client"
import { useBodyScrollLock } from "@/app/_lib/hooks/use-body-scroll-lock"
import { SettingsPageClient } from "./SettingsPageClient"
import { SettingsSidebar } from "./SettingsSidebar"
import {
  SETTINGS_MODAL_BACKDROP_CLASS,
  SETTINGS_MODAL_PANEL_CLASS,
  SETTINGS_MODAL_SHELL_CLASS,
} from "./settings-modal-shell"

type UserSettingsData = {
  email?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
}

type NotificationSettingsData = {
  batching: "immediate" | "hourly" | "daily"
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

type IntegrationsSettingsData = {
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
}

type BillingSettingsData = {
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

type SettingsData = {
  user?: UserSettingsData
  notificationPreferences?: NotificationSettingsData
  integrations?: IntegrationsSettingsData
  billing?: BillingSettingsData
}

const VALID_SETTINGS_SECTIONS = new Set([
  "general",
  "account",
  "privacy",
  "billing",
  "usage",
  "connectors",
  "business",
  "plays",
  "capture",
  "spaces",
  "memory",
])

function normalizeSettingsSection(value: string | null) {
  if (!value) return null
  return VALID_SETTINGS_SECTIONS.has(value) ? value : "general"
}

export function SettingsModalHost() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const section = normalizeSettingsSection(searchParams.get("settings"))
  const [settingsData, setSettingsData] = React.useState<SettingsData>({})

  useBodyScrollLock(Boolean(section))

  React.useEffect(() => {
    if (!section) return

    let cancelled = false

    async function loadSettingsData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const [{ data: profile }, { data: notificationPreferences }, { data: workspaceMember }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "first_name, last_name, avatar_url, stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled, saas_subscription_id, saas_subscription_status, saas_tier"
            )
            .eq("id", user.id)
            .single(),
          supabase
            .from("notification_preferences")
            .select("batching, quiet_hours_start, quiet_hours_end")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", user.id)
            .single(),
        ])

      const [subscriptionResult, creditBalanceResult, integrationsResult] = await Promise.all([
        profile?.saas_subscription_id
          ? supabase
              .from("saas_subscriptions")
              .select("tier, status, interval, current_period_end, cancel_at_period_end")
              .eq("stripe_subscription_id", profile.saas_subscription_id)
              .single()
          : Promise.resolve({ data: null }),
        supabase
          .from("ai_credit_balances")
          .select("monthly_allocation, purchased_credits, used_this_month, total_available")
          .eq("user_id", user.id)
          .single(),
        workspaceMember?.workspace_id
          ? supabase
              .from("workspace_integrations")
              .select("provider, config, is_active, composio_status")
              .eq("workspace_id", workspaceMember.workspace_id)
              .eq("is_active", true)
          : Promise.resolve({ data: null }),
      ])

      const gmailIntegration = integrationsResult.data?.find(
        (integration) => integration.provider === "gmail"
      )
      const calcomIntegration = integrationsResult.data?.find(
        (integration) => integration.provider === "calcom"
      )

      const subscription = subscriptionResult.data
        ? {
            tier: subscriptionResult.data.tier as BillingSettingsData["subscription"] extends infer Subscription
              ? Subscription extends { tier: infer Tier }
                ? Tier
                : never
              : never,
            status: subscriptionResult.data.status,
            interval: subscriptionResult.data.interval as "month" | "year",
            currentPeriodEnd: subscriptionResult.data.current_period_end ?? undefined,
            cancelAtPeriodEnd: subscriptionResult.data.cancel_at_period_end ?? false,
          }
        : {
            tier: (profile?.saas_tier ?? "none") as "none" | "solo" | "professional" | "studio" | "enterprise",
            status: profile?.saas_subscription_status ?? "none",
            interval: "month" as const,
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: false,
          }

      const nextSettingsData: SettingsData = {
        user: {
          email: user.email,
          firstName: profile?.first_name || user.user_metadata?.first_name || "",
          lastName: profile?.last_name || user.user_metadata?.last_name || "",
          avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || "",
        },
        notificationPreferences: {
          batching: (notificationPreferences?.batching as "immediate" | "hourly" | "daily" | null) ?? "immediate",
          quietHoursEnabled: Boolean(notificationPreferences?.quiet_hours_start),
          quietHoursStart: notificationPreferences?.quiet_hours_start ?? "08:00",
          quietHoursEnd: notificationPreferences?.quiet_hours_end ?? "20:00",
        },
        integrations: {
          stripe: {
            connected: profile?.stripe_connect_status === "active",
            accountId: profile?.stripe_connect_account_id ?? undefined,
            status: profile?.stripe_connect_status ?? "not_created",
            chargesEnabled: profile?.stripe_connect_charges_enabled ?? false,
          },
          google: {
            connected: Boolean(gmailIntegration),
            email: (gmailIntegration?.config as { email?: string } | null)?.email,
            studioId: workspaceMember?.workspace_id ?? undefined,
          },
          calcom: {
            connected: Boolean(calcomIntegration),
            username: (calcomIntegration?.config as { username?: string } | null)?.username,
          },
        },
        billing: {
          subscription,
          aiCredits: creditBalanceResult.data
            ? {
                monthlyAllocation: creditBalanceResult.data.monthly_allocation,
                purchasedCredits: creditBalanceResult.data.purchased_credits,
                usedThisMonth: creditBalanceResult.data.used_this_month,
                totalAvailable: creditBalanceResult.data.total_available,
              }
            : {
                monthlyAllocation: 500,
                purchasedCredits: 0,
                usedThisMonth: 0,
                totalAvailable: 500,
              },
          paymentMethod: undefined,
          invoices: [],
        },
      }

      if (!cancelled) {
        setSettingsData(nextSettingsData)
      }
    }

    void loadSettingsData()

    return () => {
      cancelled = true
    }
  }, [section])

  if (!section) return null

  function closeSettings() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("settings")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className={SETTINGS_MODAL_SHELL_CLASS}>
      <button
        type="button"
        aria-label="Close settings"
        onClick={closeSettings}
        className={SETTINGS_MODAL_BACKDROP_CLASS}
      />
      <div className={SETTINGS_MODAL_PANEL_CLASS}>
        <button
          type="button"
          aria-label="Close settings"
          onClick={closeSettings}
          className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <SettingsSidebar activeSection={section} className="hidden md:block" mode="modal" />
        <div className="min-h-0 overflow-y-auto">
          <SettingsPageClient
            section={section}
            user={settingsData.user}
            notificationPreferences={settingsData.notificationPreferences}
            integrations={settingsData.integrations}
            billing={settingsData.billing}
          />
        </div>
      </div>
    </div>
  )
}
