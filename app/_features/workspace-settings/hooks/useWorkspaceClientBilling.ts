"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

export interface ClientBillingSettings {
  payment_terms: "due_on_receipt" | "net_15" | "net_30" | "net_45" | "net_60";
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD";
  late_fee_enabled: boolean;
  late_fee_percent: number;
  tax_id: string;
  tax_rate: number;
  tax_label: string;
  invoice_prefix: string;
  next_invoice_number: number;
  invoice_notes: string;
}

const DEFAULT_BILLING_SETTINGS: ClientBillingSettings = {
  payment_terms: "net_30",
  currency: "USD",
  late_fee_enabled: false,
  late_fee_percent: 0,
  tax_id: "",
  tax_rate: 0,
  tax_label: "Tax",
  invoice_prefix: "INV-",
  next_invoice_number: 1,
  invoice_notes: "",
};

async function fetchClientBillingSettings(): Promise<ClientBillingSettings> {
  const supabase = createClient();

  // Get current user's workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_BILLING_SETTINGS;

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!member) return DEFAULT_BILLING_SETTINGS;

  const { data: studio } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", member.workspace_id)
    .single();

  if (!studio?.settings) return DEFAULT_BILLING_SETTINGS;

  // Extract client_billing from settings JSON
  const settings = studio.settings as Record<string, unknown>;
  const clientBilling = settings.client_billing as Partial<ClientBillingSettings> | undefined;

  return {
    ...DEFAULT_BILLING_SETTINGS,
    ...clientBilling,
  };
}

export function useWorkspaceClientBilling() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-client-billing",
    fetchClientBillingSettings,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    billingSettings: data || DEFAULT_BILLING_SETTINGS,
    isLoading,
    error,
    mutate,
  };
}
