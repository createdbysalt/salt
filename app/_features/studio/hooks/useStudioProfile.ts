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
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  } | null;
  team_size: string | null;
  founded_year: number | null;
}

async function fetchStudioProfile(): Promise<StudioProfile | null> {
  const supabase = createClient();

  // Get current user's studio
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  const { data: studio } = await supabase
    .from("studios")
    .select("id, name, slug, logo_url, tagline, description, website_url, social_links, team_size, founded_year")
    .eq("id", member.studio_id)
    .single();

  return studio;
}

export function useStudioProfile() {
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
