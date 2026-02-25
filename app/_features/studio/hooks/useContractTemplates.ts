"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface ContractTemplate {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  category: "msa" | "sow" | "nda" | "retainer" | "custom";
  content: string;
  variables: Record<string, unknown> | null;
  is_default: boolean;
  display_order: number;
}

async function fetchContractTemplates(): Promise<ContractTemplate[]> {
  const supabase = createClient();

  // Get current user's studio
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return [];

  const { data: templates } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("studio_id", member.studio_id)
    .order("display_order", { ascending: true });

  return templates || [];
}

export function useContractTemplates() {
  const { data, error, isLoading, mutate } = useSWR(
    "contract-templates",
    fetchContractTemplates,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    templates: data || [],
    isLoading,
    error,
    mutate,
  };
}
