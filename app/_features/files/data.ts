import { relativeDays, type SourceKind } from "@/app/_lib/demo/people-demo-data";

export { relativeDays };

export type FileCategory = "brand_asset" | "deliverable" | "contract" | "screenshot" | "other";

export type AssetKind =
  | "document"
  | "link"
  | "photo"
  | "video"
  | "audio"
  | "email"
  | "transcript";

export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  brand_asset: "Brand asset",
  deliverable: "Deliverable",
  contract: "Contract",
  screenshot: "Screenshot",
  other: "Other",
};

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  document: "Document",
  link: "Link",
  photo: "Photo",
  video: "Video",
  audio: "Audio",
  email: "Email",
  transcript: "Transcript",
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

export type MemoryFile = {
  id: string;
  name: string;
  kind: AssetKind;
  category: FileCategory;
  updatedAt: string;
  linkedTo: { kind: "person" | "org" | "work"; id: string; name: string };
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
  clientId?: string;
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
    default:
      return null;
  }
}
