import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "./SettingsPageClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Get user profile with billing info
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      customer_id,
      saas_subscription_status,
      saas_tier,
      trial_ends_at,
      stripe_connect_account_id,
      stripe_connect_status,
      stripe_connect_charges_enabled,
      stripe_connect_payouts_enabled
    `)
    .eq("id", user.id)
    .single();

  // Get AI credit balance
  const { data: creditBalance } = await supabase
    .from("ai_credit_balances")
    .select("monthly_allocation, purchased_credits, used_this_month")
    .eq("user_id", user.id)
    .single();

  // Get studio membership (for Connect features)
  const { data: membership } = await supabase
    .from("studio_members")
    .select("studio_id, role")
    .eq("user_id", user.id)
    .single();

  return (
    <SettingsPageClient
      user={user}
      profile={profile}
      creditBalance={creditBalance}
      membership={membership}
    />
  );
}
