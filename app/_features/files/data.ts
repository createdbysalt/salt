import { ORGS } from "@/app/_lib/demo/orgs-demo-data";
import { PEOPLE, relativeDays, type SourceKind } from "@/app/_lib/demo/people-demo-data";

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

function buildFileCatalog(): MemoryFile[] {
  const map = new Map<string, MemoryFile>();

  const add = (key: string, file: Omit<MemoryFile, "kind"> & { kind?: AssetKind }) => {
    if (map.has(key)) return;
    map.set(key, { ...file, kind: file.kind ?? "document" });
  };

  for (const org of ORGS) {
    for (const file of org.files) {
      add(`${org.id}:${file.id}`, {
        id: `${org.id}:${file.id}`,
        name: file.name,
        category: file.category,
        updatedAt: file.updatedAt,
        linkedTo: { kind: "org", id: org.id, name: org.name },
        source: org.source,
        tags: org.tags,
      });
    }
  }

  for (const person of PEOPLE) {
    for (const file of person.files) {
      const key = `${person.id}:${file.id}`;
      if (map.has(key)) continue;
      add(key, {
        id: key,
        name: file.name,
        category: file.category,
        updatedAt: file.updatedAt,
        linkedTo: { kind: "person", id: person.id, name: person.name },
        source: person.source,
        tags: person.tags,
      });
    }
  }

  add("link-figma-nw", {
    id: "link-figma-nw",
    name: "Northwind brand v3.fig",
    kind: "link",
    category: "brand_asset",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    linkedTo: { kind: "org", id: "northwind", name: "Northwind Studio" },
    source: "salt_inferred",
    tags: ["brand", "figma"],
    provider: "figma",
    url: "https://figma.com/file/example",
    domain: "figma.com",
  });

  add("video-atlas-kickoff", {
    id: "video-atlas-kickoff",
    name: "Atlas kickoff recording",
    kind: "video",
    category: "other",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    linkedTo: { kind: "org", id: "atlas", name: "Atlas Coaching" },
    source: "imported",
    tags: ["meeting", "kickoff"],
    provider: "granola",
    durationSec: 3420,
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export const MEMORY_FILES = buildFileCatalog();

export function findMemoryFile(id: string): MemoryFile | undefined {
  return MEMORY_FILES.find((f) => f.id === id);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
