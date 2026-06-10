"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  email: string;
  created_at: string;
  updated_at: string;
}

type WorkspaceMember = StudioMember;

async function fetchWorkspaceTeam(): Promise<WorkspaceMember[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!workspaceMember) return [];

  const { data: members } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceMember.workspace_id)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  return members || [];
}

export function useWorkspaceTeam() {
  const { data, error, isLoading, mutate } = useSWR(
    "workspace-team",
    fetchWorkspaceTeam,
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
