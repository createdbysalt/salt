"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioProjectType {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  display_order: number;
}

async function fetchStudioProjectTypes(): Promise<StudioProjectType[]> {
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

  const { data: types } = await supabase
    .from("studio_project_types")
    .select("*")
    .eq("studio_id", member.studio_id)
    .order("display_order", { ascending: true });

  return types || [];
}

export function useStudioProjectTypes() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-project-types",
    fetchStudioProjectTypes,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    projectTypes: data || [],
    isLoading,
    error,
    mutate,
  };
}
