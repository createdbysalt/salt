import { redirect } from "next/navigation"
import { createClient } from "@/app/_lib/supabase/server"
import { SettingsPageClient } from "../_components/SettingsPageClient"
import { SettingsSidebar } from "../_components/SettingsSidebar"
import { SettingsCloseButton } from "../_components/SettingsCloseButton"
import { SettingsRouteBackdrop } from "../_components/SettingsRouteBackdrop"
import {
  SETTINGS_MODAL_PANEL_CLASS,
  SETTINGS_MODAL_SHELL_CLASS,
} from "../_components/settings-modal-shell"

async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single()

  return {
    email: user.email,
    firstName: profile?.first_name || user.user_metadata?.first_name || "",
    lastName: profile?.last_name || user.user_metadata?.last_name || "",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }
}

async function getBillingData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get subscription data from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      saas_subscription_id,
      saas_subscription_status,
      saas_tier,
      trial_ends_at,
      stripe_customer_id
    `)
    .eq("id", user.id)
    .single()

  // Get active subscription details if exists
  let subscription = null
  if (profile?.saas_subscription_id) {
    const { data: subData } = await supabase
      .from("saas_subscriptions")
      .select(`
        tier,
        status,
        interval,
        current_period_end,
        cancel_at_period_end
      `)
      .eq("stripe_subscription_id", profile.saas_subscription_id)
      .single()

    if (subData) {
      subscription = {
        tier: subData.tier as "none" | "starter" | "pro" | "max" | "enterprise",
        status: subData.status,
        interval: subData.interval as "month" | "year",
        currentPeriodEnd: subData.current_period_end,
        cancelAtPeriodEnd: subData.cancel_at_period_end,
      }
    }
  }

  // If no subscription found, use profile tier
  if (!subscription && profile?.saas_tier && profile.saas_tier !== "none") {
    subscription = {
      tier: profile.saas_tier as "none" | "starter" | "pro" | "max" | "enterprise",
      status: profile.saas_subscription_status || "none",
      interval: "month" as const,
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: false,
    }
  }

  // Get AI credit balance
  const { data: creditBalance } = await supabase
    .from("ai_credit_balances")
    .select("monthly_allocation, purchased_credits, used_this_month, total_available")
    .eq("user_id", user.id)
    .single()

  const aiCredits = creditBalance
    ? {
        monthlyAllocation: creditBalance.monthly_allocation,
        purchasedCredits: creditBalance.purchased_credits,
        usedThisMonth: creditBalance.used_this_month,
        totalAvailable: creditBalance.total_available,
      }
    : {
        monthlyAllocation: 500,
        purchasedCredits: 0,
        usedThisMonth: 0,
        totalAvailable: 500,
      }

  return {
    subscription: subscription || {
      tier: "none" as const,
      status: "none",
      interval: "month" as const,
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: false,
    },
    aiCredits,
    paymentMethod: undefined, // Would require Stripe API call to fetch
    invoices: [], // Would require Stripe API call to fetch
  }
}


async function getNotificationPreferences() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("notification_preferences")
    .select("batching, quiet_hours_start, quiet_hours_end")
    .eq("user_id", user.id)
    .single()

  if (!data) {
    return {
      batching: "immediate" as const,
      quietHoursEnabled: false,
      quietHoursStart: "08:00",
      quietHoursEnd: "20:00",
    }
  }

  return {
    batching: data.batching as "immediate" | "hourly" | "daily",
    quietHoursEnabled: !!data.quiet_hours_start,
    quietHoursStart: data.quiet_hours_start || "08:00",
    quietHoursEnd: data.quiet_hours_end || "20:00",
  }
}

// Map URL paths to section names
function getSectionFromPath(sectionPath: string[] | undefined): string {
  if (!sectionPath || sectionPath.length === 0) {
    return "general"
  }

  return sectionPath[0]
}

interface PageProps {
  params: Promise<{ section?: string[] }>
}

export default async function Page({ params }: PageProps) {
  const { section: sectionPath } = await params
  const section = getSectionFromPath(sectionPath)

  if (section === "preferences" || section === "notifications") {
    redirect("/settings")
  }

  if (section === "integrations") {
    redirect("/plays?tab=connectors")
  }

  if (section === "profile" || section === "team" || section === "domains") {
    redirect("/settings/business")
  }

  if (section === "brand" || section === "voice" || section === "services") {
    redirect("/settings/business")
  }

  if (section === "clients" || section === "client-tags" || section === "work-tags") {
    redirect("/settings/memory")
  }

  if (section === "table") {
    redirect("/settings/spaces")
  }

  if (section === "agreements") {
    redirect("/plays")
  }

  if (section === "templates") {
    redirect("/plays")
  }

  if (section === "connectors") {
    redirect("/plays?tab=connectors")
  }

  if (section === "payments") {
    redirect("/plays?tab=connectors")
  }

  const [user, notificationPreferences, billing] = await Promise.all([
    getUserProfile(),
    getNotificationPreferences(),
    getBillingData(),
  ])

  return (
    <main className={SETTINGS_MODAL_SHELL_CLASS}>
      <SettingsRouteBackdrop />
      <div className={SETTINGS_MODAL_PANEL_CLASS}>
        <SettingsCloseButton />
        <SettingsSidebar className="hidden md:block" />
        <div className="min-h-0 overflow-y-auto">
          <SettingsPageClient
            section={section}
            user={user || undefined}
            notificationPreferences={notificationPreferences || undefined}
            billing={billing || undefined}
          />
        </div>
      </div>
    </main>
  )
}
