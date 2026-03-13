import { createClient } from "@/app/_lib/supabase/server";
import {
  resolveBrandingConfig,
  type ResolvedBrandingConfig,
} from "@/app/_lib/bridge/branding-config";

export interface StudioForPicker {
  id: string;
  name: string;
  branding: ResolvedBrandingConfig;
}

/**
 * Fetch studio info and branding for the client picker.
 * Returns a Map of studioId -> StudioForPicker
 */
export async function getStudiosForPicker(
  studioIds: string[]
): Promise<Map<string, StudioForPicker>> {
  if (studioIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data: studios, error } = await supabase
    .from("studios")
    .select("id, name, bridge_branding")
    .in("id", studioIds);

  if (error || !studios) {
    return new Map();
  }

  const result = new Map<string, StudioForPicker>();
  for (const studio of studios) {
    result.set(studio.id, {
      id: studio.id,
      name: studio.name,
      branding: resolveBrandingConfig(studio.bridge_branding),
    });
  }

  return result;
}
