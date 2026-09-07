"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioBrandConfig {
  id: string;
  workspace_id: string;
  color_primary: string | null;
  color_secondary: string | null;
  color_neutral: string | null;
  color_accent: string | null;
  font_heading: string | null;
  font_body: string | null;
  voice_tone: string[] | null;
  voice_spectrums: {
    formality: number;
    complexity: number;
    warmth: number;
    brevity: number;
  } | null;
  voice_archetype: string | null;
  voice_style_guide: string | null;
  voice_terminology: {
    preferred: string[];
    avoid: string[];
  } | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  logo_icon_url: string | null;
}

async function fetchStudioBrandConfig(): Promise<StudioBrandConfig | null> {
  const supabase = createClient();

  // Get current user's workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!member) return null;

  const { data: config } = await supabase
    .from("workspace_brand_config")
    .select("*")
    .eq("workspace_id", member.workspace_id)
    .single();

  return config;
}

export function useWorkspaceBrandConfig() {
  const { data, error, isLoading, mutate } = useSWR(
    "studio-brand-config",
    fetchStudioBrandConfig,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    brandConfig: data,
    isLoading,
    error,
    mutate,
  };
}
