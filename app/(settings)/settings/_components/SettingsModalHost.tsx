"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { connectorsPageUrl } from "@/app/_features/connectors/constants"
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

      const [{ data: profile }, { data: notificationPreferences }] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "first_name, last_name, avatar_url, saas_subscription_id, saas_subscription_status, saas_tier"
            )
            .eq("id", user.id)
            .single(),
          supabase
            .from("notification_preferences")
            .select("batching, quiet_hours_start, quiet_hours_end")
            .eq("user_id", user.id)
            .single(),
        ])

      const [subscriptionResult, creditBalanceResult] = await Promise.all([
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
      ])

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

  React.useEffect(() => {
    if (section === "connectors") {
      router.push(connectorsPageUrl())
    }
  }, [section, router])

  if (!section) return null
  if (section === "connectors") return null

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
            billing={settingsData.billing}
          />
        </div>
      </div>
    </div>
  )
}
