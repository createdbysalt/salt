import { hostnameMatches } from "@repo/security";
import { ASSET_KIND_LABEL, PROVIDER_LABEL, type MemoryFile } from "../data";

const LINK_PLATFORM_LABELS: Array<{ match: (domain: string) => boolean; label: string }> = [
  { match: (domain) => hostnameMatches(domain, "lovable.app"), label: "Lovable" },
  { match: (domain) => hostnameMatches(domain, "vercel.app"), label: "Vercel" },
  { match: (domain) => hostnameMatches(domain, "github.com"), label: "GitHub" },
  { match: (domain) => hostnameMatches(domain, "notion.so", "notion.site"), label: "Notion" },
];

function normalizedDomain(file: MemoryFile): string {
  return file.domain?.toLowerCase() ?? "";
}

export function fileLinkPlatformLabel(file: MemoryFile): string | null {
  if (file.kind !== "link") return null;

  const domain = normalizedDomain(file);
  for (const platform of LINK_PLATFORM_LABELS) {
    if (domain && platform.match(domain)) {
      return platform.label;
    }
  }

  if (file.provider && file.provider !== "web" && file.provider !== "local") {
    return PROVIDER_LABEL[file.provider];
  }

  return null;
}

export function resolveFileRecordUrl(record: {
  externalUrl?: string;
  appUrl?: string;
}): string | undefined {
  return record.externalUrl ?? record.appUrl;
}

export function fileLinkHref(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;

  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function fileLinkOpenLabel(file: MemoryFile): string {
  return `Open ${ASSET_KIND_LABEL[file.kind]}`;
}
