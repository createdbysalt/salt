"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
} from "@/app/_lib/stripe/stripe-connect";

export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Start Stripe Connect onboarding flow
 * Creates an Express account (if needed) and returns the onboarding URL
 */
export async function startStripeConnectOnboardingAction(): Promise<
  ActionResponse<{ url: string }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { success: false, error: "Failed to fetch profile" };
    }

    let accountId = profile?.stripe_connect_account_id;

    // Create a new Connect account if one doesn't exist
    if (!accountId) {
      const account = await createConnectAccount({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      });

      accountId = account.id;

      // Save the account ID to the profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "pending",
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        return { success: false, error: "Failed to save account" };
      }
    }

    // Create the onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const connectorsReturn = `${baseUrl}${connectorsPageUrl()}`;
    const { url } = await createAccountLink({
      accountId,
      refreshUrl: `${connectorsReturn}&stripe=refresh`,
      returnUrl: `${connectorsReturn}&stripe=complete`,
    });

    return { success: true, data: { url } };
  } catch (error) {
    console.error("Error in startStripeConnectOnboardingAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check and update Stripe Connect account status
 * Called when user returns from Stripe onboarding
 */
export async function refreshStripeConnectStatusAction(): Promise<
  ActionResponse<{
    status: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_connect_account_id) {
      return { success: false, error: "No Stripe Connect account found" };
    }

    // Get account status from Stripe
    const account = await getConnectAccount(profile.stripe_connect_account_id);

    // Determine status
    let status: string = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
    } else if (account.requirements?.disabled_reason) {
      status = "restricted";
    }

    // Update profile with latest status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_connect_status: status,
        stripe_connect_charges_enabled: account.charges_enabled,
        stripe_connect_payouts_enabled: account.payouts_enabled,
        stripe_connect_details_submitted: account.details_submitted,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return { success: false, error: "Failed to update status" };
    }

    revalidatePath("/settings");

    return {
      success: true,
      data: {
        status,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
      },
    };
  } catch (error) {
    console.error("Error in refreshStripeConnectStatusAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Disconnect Stripe Connect account
 * Note: This doesn't delete the Stripe account, just removes the link
 */
export async function disconnectStripeConnectAction(): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Clear Connect fields (but keep account_id for potential reconnection)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_connect_status: "not_created",
        stripe_connect_charges_enabled: false,
        stripe_connect_payouts_enabled: false,
        stripe_connect_details_submitted: false,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return { success: false, error: "Failed to disconnect" };
    }

    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in disconnectStripeConnectAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
