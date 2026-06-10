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
};

export const MEMORY_FILES: MemoryFile[] = [];

export function findMemoryFile(id: string): MemoryFile | undefined {
  return MEMORY_FILES.find((f) => f.id === id);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
