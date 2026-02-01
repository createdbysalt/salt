import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getConnectAccount } from "@/app/_lib/stripe/stripe-connect";
import BillingStatusCard from "./BillingStatusCard";
import ConnectStatusCard from "./ConnectStatusCard";
import CreditPacksCard from "./CreditPacksCard";
import ClientBillingOverviewCard from "./ClientBillingOverviewCard";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin?next=/dashboard/settings/billing");
  }

  // Get user profile with billing info
  let { data: profile } = await supabase
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

  // If there's a Connect account but charges aren't enabled, refresh from Stripe
  // This handles the case when user returns from onboarding
  if (profile?.stripe_connect_account_id && !profile.stripe_connect_charges_enabled) {
    try {
      const account = await getConnectAccount(profile.stripe_connect_account_id);

      // Update profile with fresh status from Stripe
      if (account.charges_enabled !== profile.stripe_connect_charges_enabled ||
          account.payouts_enabled !== profile.stripe_connect_payouts_enabled) {
        await supabase
          .from("profiles")
          .update({
            stripe_connect_charges_enabled: account.charges_enabled,
            stripe_connect_payouts_enabled: account.payouts_enabled,
            stripe_connect_status: account.charges_enabled ? "active" : "pending",
          })
          .eq("id", user.id);

        // Update local profile object with fresh data
        profile = {
          ...profile,
          stripe_connect_charges_enabled: account.charges_enabled,
          stripe_connect_payouts_enabled: account.payouts_enabled,
          stripe_connect_status: account.charges_enabled ? "active" : "pending",
        };
      }
    } catch (err) {
      console.error("Failed to refresh Connect account status:", err);
    }
  }

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

  // Get subscription details (renewal date, interval, cancel status)
  const { data: subscription } = await supabase
    .from("saas_subscriptions")
    .select("current_period_end, interval, cancel_at_period_end, canceled_at")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get client billing overview data (only if user has Connect enabled)
  let billingOverviewData = null;
  if (membership?.studio_id && profile?.stripe_connect_charges_enabled) {
    const studioId = membership.studio_id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get total received this month from paid invoices
    const { data: paidInvoices } = await supabase
      .from("bridge_invoices")
      .select("amount_cents, paid_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", monthStart);

    const totalReceivedCents = paidInvoices?.reduce((sum, inv) => sum + inv.amount_cents, 0) || 0;

    // Get pending invoices count
    const { data: pendingInvoices } = await supabase
      .from("bridge_invoices")
      .select("id, client_id, amount_cents")
      .eq("studio_id", studioId)
      .in("status", ["sent", "viewed"]);

    const pendingInvoiceCount = pendingInvoices?.length || 0;

    // Get active retainers count
    const { data: activeRetainers } = await supabase
      .from("bridge_client_subscriptions")
      .select("id, client_id, amount_cents")
      .eq("studio_id", studioId)
      .in("status", ["active", "trialing"]);

    const activeRetainerCount = activeRetainers?.length || 0;

    // Get failed invoices
    const { data: failedInvoices } = await supabase
      .from("bridge_invoices")
      .select("id, client_id, amount_cents")
      .eq("studio_id", studioId)
      .eq("status", "failed");

    // Get failed retainers (past_due status)
    const { data: failedRetainers } = await supabase
      .from("bridge_client_subscriptions")
      .select("id, client_id")
      .eq("studio_id", studioId)
      .eq("status", "past_due");

    // Get client names for failed payments and activity
    const allClientIds = new Set<string>();
    pendingInvoices?.forEach((inv) => allClientIds.add(inv.client_id));
    activeRetainers?.forEach((ret) => allClientIds.add(ret.client_id));
    failedInvoices?.forEach((inv) => allClientIds.add(inv.client_id));
    failedRetainers?.forEach((ret) => allClientIds.add(ret.client_id));

    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", Array.from(allClientIds));

    const clientNameMap = new Map<string, string>();
    clients?.forEach((c) => clientNameMap.set(c.id, c.name));

    // Build failed payments array
    const failedPaymentsMap = new Map<string, { failedInvoices: number; failedRetainers: boolean }>();
    failedInvoices?.forEach((inv) => {
      const existing = failedPaymentsMap.get(inv.client_id) || { failedInvoices: 0, failedRetainers: false };
      existing.failedInvoices += 1;
      failedPaymentsMap.set(inv.client_id, existing);
    });
    failedRetainers?.forEach((ret) => {
      const existing = failedPaymentsMap.get(ret.client_id) || { failedInvoices: 0, failedRetainers: false };
      existing.failedRetainers = true;
      failedPaymentsMap.set(ret.client_id, existing);
    });

    const failedPayments = Array.from(failedPaymentsMap.entries()).map(([clientId, data]) => ({
      id: clientId,
      name: clientNameMap.get(clientId) || "Unknown Client",
      failedInvoices: data.failedInvoices,
      failedRetainers: data.failedRetainers,
    }));

    // Build clients with activity array
    const activityMap = new Map<string, { pendingInvoices: number; activeRetainer: boolean }>();
    pendingInvoices?.forEach((inv) => {
      const existing = activityMap.get(inv.client_id) || { pendingInvoices: 0, activeRetainer: false };
      existing.pendingInvoices += 1;
      activityMap.set(inv.client_id, existing);
    });
    activeRetainers?.forEach((ret) => {
      const existing = activityMap.get(ret.client_id) || { pendingInvoices: 0, activeRetainer: false };
      existing.activeRetainer = true;
      activityMap.set(ret.client_id, existing);
    });

    const clientsWithActivity = Array.from(activityMap.entries()).map(([clientId, data]) => ({
      id: clientId,
      name: clientNameMap.get(clientId) || "Unknown Client",
      pendingInvoices: data.pendingInvoices,
      activeRetainer: data.activeRetainer,
    }));

    billingOverviewData = {
      totalReceivedCents,
      pendingInvoiceCount,
      activeRetainerCount,
      failedPayments,
      clientsWithActivity,
    };
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Billing & Subscription"
        description="Manage your Salt Core subscription, credits, and client billing setup."
        noBorder
      />

      {/* SaaS Subscription Status */}
      <BillingStatusCard
        saasStatus={profile?.saas_subscription_status || "none"}
        saasTier={profile?.saas_tier || "none"}
        trialEndsAt={profile?.trial_ends_at}
        customerId={profile?.customer_id}
        currentPeriodEnd={subscription?.current_period_end}
        billingInterval={subscription?.interval}
        cancelAtPeriodEnd={subscription?.cancel_at_period_end}
      />
      
      {/* AI Credits */}
      <CreditPacksCard
        monthlyAllocation={creditBalance?.monthly_allocation || 0}
        purchasedCredits={creditBalance?.purchased_credits || 0}
        usedThisMonth={creditBalance?.used_this_month || 0}
        userTier={profile?.saas_tier || null}
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

      {/* Client Billing Overview (only shown when Connect is enabled) */}
      {billingOverviewData && (
        <ClientBillingOverviewCard
          totalReceivedCents={billingOverviewData.totalReceivedCents}
          pendingInvoiceCount={billingOverviewData.pendingInvoiceCount}
          activeRetainerCount={billingOverviewData.activeRetainerCount}
          failedPayments={billingOverviewData.failedPayments}
          clientsWithActivity={billingOverviewData.clientsWithActivity}
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


