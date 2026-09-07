"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioService {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricing_type: "fixed" | "hourly" | "retainer" | "custom" | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  deliverables: string[] | null;
  typical_timeline: string | null;
  ai_description: string | null;
  display_order: number;
  is_active: boolean;
}

async function fetchStudioServices(): Promise<StudioService[]> {
  const supabase = createClient();

  // Get current user's workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!member) return [];

  const { data: services } = await supabase
    .from("workspace_services")
    .select("*")
    .eq("workspace_id", member.workspace_id)
    .order("display_order", { ascending: true });

  return services || [];
}

export function useWorkspaceServices() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-services",
    fetchStudioServices,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    services: data || [],
    isLoading,
    error,
    mutate,
  };
}
