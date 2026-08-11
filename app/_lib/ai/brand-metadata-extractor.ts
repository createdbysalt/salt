import "server-only";

import sharp from "sharp";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { BrandAssetMetadata } from "@/app/_features/resources/data";

const EXTRACTOR_VERSION = 1;
const SAMPLE_SIZE = 48;
const PALETTE_SIZE = 5;
/** Quantization step per RGB channel — 32 gives 8x8x8 buckets. */
const QUANT_STEP = 32;

export type PaletteColor = { hex: string; role?: "primary" | "secondary" | "accent" | "neutral" };

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function isNeutral(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 24 || max > 240 || max < 24;
}

/**
 * Extract the dominant palette from raw RGBA pixels by quantized-bucket
 * frequency, skipping transparent pixels. Returns up to PALETTE_SIZE colors,
 * most frequent first, with a rough role assignment (first saturated color =
 * primary, second = accent, grays = neutral).
 */
export function extractPalette(
  pixels: Buffer | Uint8Array,
  channels: number,
): PaletteColor[] {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i + channels <= pixels.length; i += channels) {
    const alpha = channels === 4 ? pixels[i + 3] : 255;
    if (alpha < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = `${Math.floor(r / QUANT_STEP)}:${Math.floor(g / QUANT_STEP)}:${Math.floor(b / QUANT_STEP)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, PALETTE_SIZE);
  let saturatedSeen = 0;

  return ranked.map((bucket) => {
    const r = Math.round(bucket.r / bucket.count);
    const g = Math.round(bucket.g / bucket.count);
    const b = Math.round(bucket.b / bucket.count);
    let role: PaletteColor["role"];
    if (isNeutral(r, g, b)) {
      role = "neutral";
    } else {
      role = saturatedSeen === 0 ? "primary" : saturatedSeen === 1 ? "accent" : "secondary";
      saturatedSeen += 1;
    }
    return { hex: toHex(r, g, b), role };
  });
}

/**
 * Analyze an image buffer into Brand Kit metadata: resolution, transparency
 * (transparent logos are the classic brand-asset tell), and dominant palette.
 */
export async function analyzeBrandImage(buffer: Buffer): Promise<BrandAssetMetadata> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const { data, info } = await image
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const colors = extractPalette(data, info.channels);
  const hasAlpha = Boolean(meta.hasAlpha);

  return {
    asset_type: "logo",
    background: hasAlpha ? "transparent" : "solid",
    colors,
    resolution:
      meta.width && meta.height ? { width: meta.width, height: meta.height } : undefined,
    extracted_at: new Date().toISOString(),
    extractor_version: EXTRACTOR_VERSION,
  };
}

/**
 * Download a brand-asset image from storage, extract metadata, and store it
 * on the file row. Preserves any user-set fields (asset_type, variant, mode,
 * font info) — extraction only fills the machine-derived ones.
 * Fire-and-forget from the upload path; errors are logged, never thrown.
 */
export async function extractAndStoreBrandMetadata(fileId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: file } = await admin
      .from("resources")
      .select("id, bucket_id, object_path, mime_type, brand_metadata")
      .eq("id", fileId)
      .maybeSingle();

    if (!file?.object_path || !file.mime_type?.startsWith("image/")) return;

    const { data: blob, error: downloadError } = await admin.storage
      .from(file.bucket_id ?? "bridge-files")
      .download(file.object_path);
    if (downloadError || !blob) {
      console.error("Brand metadata download failed:", fileId, downloadError?.message);
      return;
    }

    const extracted = await analyzeBrandImage(Buffer.from(await blob.arrayBuffer()));
    const existing =
      file.brand_metadata && typeof file.brand_metadata === "object"
        ? (file.brand_metadata as Partial<BrandAssetMetadata>)
        : {};

    await admin
      .from("resources")
      .update({
        brand_metadata: { ...extracted, ...existing, colors: extracted.colors, resolution: extracted.resolution, extracted_at: extracted.extracted_at, extractor_version: EXTRACTOR_VERSION },
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId);
  } catch (error) {
    console.error("Brand metadata extraction failed:", fileId, error);
  }
}
