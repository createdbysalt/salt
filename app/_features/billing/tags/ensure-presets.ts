"use server";

/**
 * Ensure Billing Tag Presets
 *
 * Lazily creates billing tag presets if they don't exist.
 * Called on first visit to a billing page.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { createTag, getTags } from "@/app/_features/memory/tags";
import { BILLING_TAG_PRESETS } from "./presets";

export async function ensureBillingTagPresets(): Promise<{
  success: boolean;
  created: number;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .single();

  if (!member) {
    return { success: false, created: 0, error: "No workspace found" };
  }

  const existingResult = await getTags({ scope: "billing" });
  if (!existingResult.success) {
    return { success: false, created: 0, error: existingResult.error };
  }

  const existingSlugs = new Set(existingResult.data.map((tag) => tag.slug));
  let created = 0;

  for (const preset of BILLING_TAG_PRESETS) {
    if (existingSlugs.has(preset.slug)) {
      continue;
    }

    const result = await createTag({
      label: preset.label,
      scope: "billing",
      category: preset.category,
      aiDescription: preset.aiDescription,
    });

    if (result.success && result.action === "created") {
      created++;
    }
  }

  return { success: true, created };
}
