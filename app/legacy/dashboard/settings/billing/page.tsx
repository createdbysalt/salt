import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import BillingStatusCard from "./BillingStatusCard";
import ConnectStatusCard from "./ConnectStatusCard";
import CreditPacksCard from "./CreditPacksCard";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/signin?next=/dashboard/settings/billing");
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Salt Core subscription, credits, and client billing setup.
        </p>
      </div>
      
      {/* SaaS Subscription Status */}
      <BillingStatusCard
        saasStatus={profile?.saas_subscription_status || "none"}
        saasTier={profile?.saas_tier || "none"}
        trialEndsAt={profile?.trial_ends_at}
        customerId={profile?.customer_id}
      />
      
      {/* AI Credits */}
      <CreditPacksCard
        monthlyAllocation={creditBalance?.monthly_allocation || 0}
        purchasedCredits={creditBalance?.purchased_credits || 0}
        usedThisMonth={creditBalance?.used_this_month || 0}
      />
      
      {/* Stripe Connect for Client Billing */}
      {membership && (
        <ConnectStatusCard
          studioId={membership.studio_id}
          connectAccountId={profile?.stripe_connect_account_id}
          connectStatus={profile?.stripe_connect_status || "not_created"}
          chargesEnabled={profile?.stripe_connect_charges_enabled || false}
          payoutsEnabled={profile?.stripe_connect_payouts_enabled || false}
        />
      )}
      
      {/* Help Section */}
      <div className="bg-muted/30 rounded-lg p-6">
        <h3 className="font-semibold mb-2">Need Help?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Questions about billing, invoices, or your subscription? We're here to help.
        </p>
        <a
          href="mailto:support@salt.studio"
          className="text-sm font-medium text-primary hover:underline"
        >
          Contact Support →
        </a>
      </div>
    </div>
  );
}


