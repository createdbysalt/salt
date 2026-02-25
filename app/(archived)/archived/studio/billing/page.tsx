import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getConnectAccount } from "@/app/_lib/stripe/stripe-connect";
import BillingStatusCard from "../settings/billing/BillingStatusCard";
import ConnectStatusCard from "../settings/billing/ConnectStatusCard";
import CreditPacksCard from "../settings/billing/CreditPacksCard";
import ClientBillingOverviewCard from "../settings/billing/ClientBillingOverviewCard";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

/**
 * Studio Mode - Billing
 *
 * Quick access to billing from the sidebar.
 * Same content as settings/billing but accessible from main nav.
 */
export default async function StudioBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin?next=/studio/billing");
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
  if (profile?.stripe_connect_account_id && !profile.stripe_connect_charges_enabled) {
    try {
      const account = await getConnectAccount(profile.stripe_connect_account_id);

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

  // Get studio membership
  const { data: membership } = await supabase
    .from("studio_members")
    .select("studio_id, role")
    .eq("user_id", user.id)
    .single();

  // Get subscription details
  const { data: subscription } = await supabase
    .from("saas_subscriptions")
    .select("current_period_end, interval, cancel_at_period_end, canceled_at")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get client billing overview data
  let billingOverviewData = null;
  if (membership?.studio_id && profile?.stripe_connect_charges_enabled) {
    const studioId = membership.studio_id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: paidInvoices } = await supabase
      .from("bridge_invoices")
      .select("amount_cents, paid_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", monthStart);

    const totalReceivedCents = paidInvoices?.reduce((sum, inv) => sum + inv.amount_cents, 0) || 0;

    const { data: pendingInvoices } = await supabase
      .from("bridge_invoices")
      .select("id, client_id, amount_cents")
      .eq("studio_id", studioId)
      .in("status", ["sent", "viewed"]);

    const { data: activeRetainers } = await supabase
      .from("bridge_client_subscriptions")
      .select("id, client_id, amount_cents")
      .eq("studio_id", studioId)
      .in("status", ["active", "trialing"]);

    const { data: failedInvoices } = await supabase
      .from("bridge_invoices")
      .select("id, client_id, amount_cents")
      .eq("studio_id", studioId)
      .eq("status", "failed");

    const { data: failedRetainers } = await supabase
      .from("bridge_client_subscriptions")
      .select("id, client_id")
      .eq("studio_id", studioId)
      .eq("status", "past_due");

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
      pendingInvoiceCount: pendingInvoices?.length || 0,
      activeRetainerCount: activeRetainers?.length || 0,
      failedPayments,
      clientsWithActivity,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription, credits, and client billing"
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

      {/* Client Billing Overview */}
      {billingOverviewData && (
        <ClientBillingOverviewCard
          totalReceivedCents={billingOverviewData.totalReceivedCents}
          pendingInvoiceCount={billingOverviewData.pendingInvoiceCount}
          activeRetainerCount={billingOverviewData.activeRetainerCount}
          failedPayments={billingOverviewData.failedPayments}
          clientsWithActivity={billingOverviewData.clientsWithActivity}
        />
      )}
    </div>
  );
}
