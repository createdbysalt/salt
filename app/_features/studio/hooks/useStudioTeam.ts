"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioMember {
  id: string;
  studio_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  email: string;
  created_at: string;
  updated_at: string;
}

async function fetchStudioTeam(): Promise<StudioMember[]> {
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

  const { data: members } = await supabase
    .from("studio_members")
    .select("*")
    .eq("studio_id", member.studio_id)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  return members || [];
}

export function useStudioTeam() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-team",
    fetchStudioTeam,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    members: data || [],
    isLoading,
    error,
    mutate,
  };
}
