"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioProjectType {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  display_order: number;
}

async function fetchStudioProjectTypes(): Promise<StudioProjectType[]> {
  const supabase = createClient();

  // Get current user's workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return [];

  const { data: types } = await supabase
    .from("workspace_project_types")
    .select("*")
    .eq("workspace_id", member.workspace_id)
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
