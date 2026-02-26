import { AppSidebar, SidebarInset, SidebarProvider } from "@repo/ui"
import { createClient } from "@/app/_lib/supabase/server"
import { SettingsPageClient } from "../_components/SettingsPageClient"

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
        tier: subData.tier as "none" | "solo" | "professional" | "studio" | "enterprise",
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
      tier: profile.saas_tier as "none" | "solo" | "professional" | "studio" | "enterprise",
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

async function getIntegrations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  console.log("[getIntegrations] User:", user?.id)

  if (!user) return null

  // Get profile with Stripe Connect status
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled")
    .eq("id", user.id)
    .single()

  // Get user's studio membership to check Gmail connection
  const { data: studioMember, error: studioError } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single()

  console.log("[getIntegrations] Studio member:", studioMember, "Error:", studioError)

  // Get Gmail connection if user has a studio
  let gmailConnection = null
  if (studioMember?.studio_id) {
    const { data: gmail, error: gmailError } = await supabase
      .from("gmail_connections")
      .select("email")
      .eq("user_id", user.id)
      .eq("studio_id", studioMember.studio_id)
      .single()
    console.log("[getIntegrations] Gmail connection:", gmail, "Error:", gmailError)
    gmailConnection = gmail
  }

  const result = {
    stripe: {
      connected: profile?.stripe_connect_status === "active",
      accountId: profile?.stripe_connect_account_id || undefined,
      status: profile?.stripe_connect_status || "not_created",
      chargesEnabled: profile?.stripe_connect_charges_enabled || false,
    },
    google: {
      connected: !!gmailConnection,
      email: gmailConnection?.email || undefined,
      studioId: studioMember?.studio_id || undefined,
    },
    calcom: {
      connected: false, // TODO: Implement Cal.com integration
    },
  }

  console.log("[getIntegrations] Result:", result)
  return result
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
    return "preferences"
  }

  // Handle nested paths like /settings/studio/profile
  if (sectionPath[0] === "studio" && sectionPath.length > 1) {
    return sectionPath[1]
  }

  return sectionPath[0]
}

interface PageProps {
  params: Promise<{ section?: string[] }>
}

export default async function Page({ params }: PageProps) {
  const { section: sectionPath } = await params
  const section = getSectionFromPath(sectionPath)

  const [user, notificationPreferences, integrations, billing] = await Promise.all([
    getUserProfile(),
    getNotificationPreferences(),
    getIntegrations(),
    getBillingData(),
  ])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <SettingsPageClient
          section={section}
          user={user || undefined}
          notificationPreferences={notificationPreferences || undefined}
          integrations={integrations || undefined}
          billing={billing || undefined}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
