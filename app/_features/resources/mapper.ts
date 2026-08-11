import { hostnameMatches } from "@repo/security";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";
import type {
  AssetKind,
  BrandAssetMetadata,
  FileCategory,
  MemoryFile,
  Provider,
} from "./data";

export type ProjectFileRow = {
  id: string;
  file_name: string;
  file_type: "file" | "link" | null;
  mime_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  category: FileCategory | null;
  source_type: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  person_id: string | null;
  organization_id: string | null;
  uploaded_by: string | null;
  ai_summary: string | null;
  brand_metadata?: unknown;
  is_operator_asset?: boolean | null;
  person?: { id: string; name: string | null } | null;
  org?: { id: string; name: string | null } | null;
  project?: { id: string; name: string | null } | null;
  /** Attachment-edge backlink targets (entity_links relation_type='attachment'). */
  billing?: { id: string; name: string | null } | null;
  meeting?: { id: string; name: string | null } | null;
};

export type FileTagRow = {
  id: string;
  label: string;
};

function inferProviderFromUrl(url: string | null | undefined): Provider | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (hostnameMatches(host, "docs.google.com", "drive.google.com")) return "gdrive";
    if (hostnameMatches(host, "figma.com")) return "figma";
    if (hostnameMatches(host, "notion.so", "notion.site")) return "notion";
    if (hostnameMatches(host, "loom.com")) return "loom";
    if (hostnameMatches(host, "zoom.us")) return "zoom";
    if (hostnameMatches(host, "gmail.com") || host === "mail.google.com") return "gmail";
    return "web";
  } catch {
    return "web";
  }
}

function inferAssetKind(row: ProjectFileRow): AssetKind {
  if (row.file_type === "link") return "link";
  const mime = row.mime_type?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function mapSource(sourceType: string | null | undefined): SourceKind {
  if (sourceType === "import" || sourceType === "email_received") return "imported";
  return "user";
}

function resolveLinkedTo(row: ProjectFileRow): MemoryFile["linkedTo"] {
  if (row.project?.id && row.project.name) {
    return { kind: "work", id: row.project.id, name: row.project.name };
  }
  if (row.person?.id) {
    return { kind: "person", id: row.person.id, name: row.person.name?.trim() ?? "" };
  }
  if (row.org?.id) {
    return { kind: "org", id: row.org.id, name: row.org.name?.trim() ?? "" };
  }
  if (row.billing?.id) {
    return { kind: "billing", id: row.billing.id, name: row.billing.name?.trim() ?? "" };
  }
  if (row.meeting?.id) {
    return { kind: "meeting", id: row.meeting.id, name: row.meeting.name?.trim() ?? "" };
  }
  if (row.person_id) {
    return { kind: "person", id: row.person_id, name: "" };
  }
  if (row.organization_id) {
    return { kind: "org", id: row.organization_id, name: "" };
  }
  return { kind: "person", id: "unknown", name: "" };
}

function extractDomain(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function mapProjectFileToMemoryFile(
  row: ProjectFileRow,
  tagLabels: string[] = [],
): MemoryFile {
  const url = row.external_url ?? undefined;
  const kind = inferAssetKind(row);
  const provider =
    row.file_type === "link"
      ? inferProviderFromUrl(url)
      : kind === "document" || kind === "photo"
        ? "local"
        : inferProviderFromUrl(url);

  return {
    id: row.id,
    name: row.file_name,
    kind,
    category: row.category ?? "other",
    updatedAt: row.updated_at ?? row.created_at,
    linkedTo: resolveLinkedTo(row),
    source: mapSource(row.source_type),
    tags: tagLabels,
    provider,
    url,
    domain: kind === "link" ? extractDomain(url) : undefined,
    description: row.description ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    mimeType: row.mime_type ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    brandMetadata: parseBrandMetadata(row.brand_metadata),
    isOperatorAsset: row.is_operator_asset ?? false,
  };
}

function parseBrandMetadata(value: unknown): BrandAssetMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<BrandAssetMetadata>;
  if (typeof candidate.asset_type !== "string") return undefined;
  return candidate as BrandAssetMetadata;
}

export function findMemoryFileInList(
  files: MemoryFile[],
  id: string,
): MemoryFile | undefined {
  return files.find((file) => file.id === id);
}
