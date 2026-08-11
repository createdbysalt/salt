import { relativeDays, type SourceKind } from "@/app/_lib/demo/people-demo-data";

export { relativeDays };

export type FileCategory =
  | "brand_asset"
  | "deliverable"
  | "contract"
  | "invoice"
  | "proposal"
  | "reference"
  | "media"
  | "notes"
  | "process"
  | "screenshot"
  | "other";

export type AssetKind =
  | "document"
  | "link"
  | "photo"
  | "video"
  | "audio"
  | "transcript"
  | "other";

export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  brand_asset: "Brand asset",
  deliverable: "Deliverable",
  contract: "Contract",
  invoice: "Invoice",
  proposal: "Proposal",
  reference: "Reference",
  media: "Media",
  notes: "Notes",
  process: "Process",
  screenshot: "Screenshot",
  other: "Other",
};

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  document: "Document",
  link: "Link",
  photo: "Photo",
  video: "Video",
  audio: "Audio",
  transcript: "Transcript",
  other: "Other",
};

export type Provider =
  | "gdrive"
  | "figma"
  | "notion"
  | "loom"
  | "zoom"
  | "granola"
  | "gmail"
  | "web"
  | "local";

export const PROVIDER_LABEL: Record<Provider, string> = {
  gdrive: "Google Drive",
  figma: "Figma",
  notion: "Notion",
  loom: "Loom",
  zoom: "Zoom",
  granola: "Granola",
  gmail: "Gmail",
  web: "Web",
  local: "Uploaded",
};

/**
 * Structured Brand Kit metadata stored in files.brand_metadata.
 * Written by the sharp-based extractor on upload (auto) and editable by
 * the user; consumed by getBrandKitContext for AI prompts.
 */
export type BrandAssetMetadata = {
  asset_type: "logo" | "color" | "font" | "icon" | "pattern" | "photo";
  variant?: "primary" | "secondary" | "icon" | "wordmark" | "lockup";
  mode?: "light" | "dark" | "mono" | "color";
  background?: "transparent" | "solid" | "any";
  colors?: Array<{ hex: string; role?: "primary" | "secondary" | "accent" | "neutral" }>;
  font_family?: string;
  font_role?: "heading" | "body" | "accent" | "ui";
  resolution?: { width: number; height: number };
  extracted_at?: string;
  extractor_version?: number;
};

export type MemoryFile = {
  id: string;
  name: string;
  kind: AssetKind;
  category: FileCategory;
  updatedAt: string;
  linkedTo: { kind: "person" | "org" | "work" | "billing" | "meeting"; id: string; name: string };
  source: SourceKind;
  tags: string[];
  provider?: Provider;
  url?: string;
  domain?: string;
  durationSec?: number;
  from?: string;
  description?: string;
  aiSummary?: string;
  mimeType?: string;
  sizeBytes?: number;
  brandMetadata?: BrandAssetMetadata;
  /** TRUE = the operator's own business asset (Me Files tab). */
  isOperatorAsset?: boolean;
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const PLACEHOLDER_CONNECTION_NAMES = new Set(["unknown", "unlinked"]);

export function hasDisplayableFileConnection(linkedTo: MemoryFile["linkedTo"]): boolean {
  const name = linkedTo.name.trim();
  if (!name || PLACEHOLDER_CONNECTION_NAMES.has(name.toLowerCase())) {
    return false;
  }
  if (!linkedTo.id || linkedTo.id === "unknown") {
    return false;
  }
  return true;
}

export function memoryConnectionHref(
  linkedTo: MemoryFile["linkedTo"],
): string | null {
  if (!hasDisplayableFileConnection(linkedTo)) {
    return null;
  }

  switch (linkedTo.kind) {
    case "person":
      return `/people/${linkedTo.id}`;
    case "org":
      return `/orgs/${linkedTo.id}`;
    case "work":
      return `/work/${linkedTo.id}`;
    case "billing":
      return `/billing/${linkedTo.id}`;
    case "meeting":
      return `/meetings/${linkedTo.id}`;
    default:
      return null;
  }
}
