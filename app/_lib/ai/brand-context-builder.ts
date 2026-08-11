import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { BrandAssetMetadata } from "@/app/_features/resources/data";

const MAX_ASSETS = 8;
const CHAR_BUDGET = 800;

type BrandAssetRow = {
  id: string;
  file_name: string;
  brand_metadata: unknown;
};

export function formatBrandAssetLine(row: BrandAssetRow): string {
  const meta =
    row.brand_metadata && typeof row.brand_metadata === "object"
      ? (row.brand_metadata as Partial<BrandAssetMetadata>)
      : null;

  const parts: string[] = [row.file_name];
  if (meta?.asset_type) parts.push(meta.asset_type);
  if (meta?.variant) parts.push(`${meta.variant} variant`);
  if (meta?.background === "transparent") parts.push("transparent background");
  const colors = (meta?.colors ?? [])
    .filter((c) => c?.hex)
    .slice(0, 4)
    .map((c) => (c.role && c.role !== "neutral" ? `${c.hex} (${c.role})` : c.hex));
  if (colors.length > 0) parts.push(`colors: ${colors.join(", ")}`);
  if (meta?.font_family) parts.push(`font: ${meta.font_family}${meta.font_role ? ` (${meta.font_role})` : ""}`);
  return `- ${parts.join(" — ")}`;
}

/**
 * Compact Brand Kit summary for AI prompts: the workspace's brand assets
 * (category = brand_asset) with their extracted palettes and fonts.
 * Hard character budget; whole-line truncation. Empty string when the
 * workspace has no brand assets.
 */
export async function getBrandKitContext(workspaceId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resources")
    .select("id, file_name, brand_metadata")
    .eq("workspace_id", workspaceId)
    .eq("category", "brand_asset")
    .eq("is_operator_asset", true)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_ASSETS);

  if (error || !data || data.length === 0) return "";

  const lines: string[] = ["Brand kit:"];
  let used = lines[0].length;
  for (const row of data) {
    const line = formatBrandAssetLine(row as BrandAssetRow);
    if (used + line.length + 1 > CHAR_BUDGET) break;
    lines.push(line);
    used += line.length + 1;
  }

  return lines.length > 1 ? lines.join("\n") : "";
}
