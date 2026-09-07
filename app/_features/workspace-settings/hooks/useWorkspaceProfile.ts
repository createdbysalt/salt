"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioProfile {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;
  website_url: string | null;
  social_links: {
    x?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    behance?: string;
    dribbble?: string;
    tiktok?: string;
    vimeo?: string;
    github?: string;
  } | null;
  team_size: string | null;
  founded_year: number | null;
  location: string | null;
}

async function fetchStudioProfile(): Promise<StudioProfile | null> {
  const supabase = createClient();

  // Get current user's workspace
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("[useWorkspaceProfile] Auth error:", userError.message);
    return null;
  }
  if (!user) {
    console.warn("[useWorkspaceProfile] No authenticated user");
    return null;
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    console.error("[useWorkspaceProfile] workspace_members query error:", memberError.message);
    return null;
  }
  if (!member) {
    console.warn("[useWorkspaceProfile] No studio membership for user:", user.id);
    return null;
  }

  const { data: studio, error: studioError } = await supabase
    .from("workspaces")
    .select("id, name, slug, logo_url, tagline, description, website_url, social_links, team_size, founded_year, location")
    .eq("id", member.workspace_id)
    .single();

  if (studioError) {
    console.error("[useWorkspaceProfile] workspaces query error:", studioError.message);
    return null;
  }

  return studio;
}

export function useWorkspaceProfile() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-profile",
    fetchStudioProfile,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    studio: data,
    isLoading,
    error,
    mutate,
  };
}
