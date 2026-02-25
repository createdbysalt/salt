"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioService {
  id: string;
  studio_id: string;
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

  // Get current user's studio
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return [];

  const { data: services } = await supabase
    .from("studio_services")
    .select("*")
    .eq("studio_id", member.studio_id)
    .order("display_order", { ascending: true });

  return services || [];
}

export function useStudioServices() {
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
