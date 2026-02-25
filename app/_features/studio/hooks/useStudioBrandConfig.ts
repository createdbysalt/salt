"use client";

import useSWR from "swr";
import { createClient } from "@/app/_lib/supabase/client";

interface StudioBrandConfig {
  id: string;
  studio_id: string;
  color_primary: string | null;
  color_secondary: string | null;
  color_neutral: string | null;
  color_accent: string | null;
  font_heading: string | null;
  font_body: string | null;
  voice_tone: string[] | null;
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

  // Get current user's studio
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("studio_members")
    .select("studio_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  const { data: config } = await supabase
    .from("studio_brand_config")
    .select("*")
    .eq("studio_id", member.studio_id)
    .single();

  return config;
}

export function useStudioBrandConfig() {
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
