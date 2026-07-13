import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";

export interface VoiceProfile {
  id: string;
  slug: string;
  name: string;
  tone: string;
  instructions: string;
  sign_off: string | null;
  type: "salt" | "custom";
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export const getVoices = cache(async (workspaceId: string): Promise<VoiceProfile[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_voices")
    .select("*")
    .or(`type.eq.salt,workspace_id.eq.${workspaceId}`)
    .order("type", { ascending: false })
    .order("name");

  if (error) {
    console.error("Failed to fetch voices:", error);
    return [];
  }

  return (data ?? []) as VoiceProfile[];
});

export const getVoiceBySlug = cache(async (
  workspaceId: string,
  slug: string
): Promise<VoiceProfile | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_voices")
    .select("*")
    .or(`type.eq.salt,workspace_id.eq.${workspaceId}`)
    .eq("slug", slug)
    .single();

  if (error) {
    return null;
  }

  return data as VoiceProfile;
});

export const getSaltVoices = cache(async (): Promise<VoiceProfile[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_voices")
    .select("*")
    .eq("type", "salt")
    .order("name");

  if (error) {
    console.error("Failed to fetch Salt voices:", error);
    return [];
  }

  return (data ?? []) as VoiceProfile[];
});
