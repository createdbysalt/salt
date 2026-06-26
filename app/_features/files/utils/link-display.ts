import { hostnameMatches } from "@repo/security";
import { PROVIDER_LABEL, type MemoryFile } from "../data";

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

export function fileLinkOpenLabel(file: MemoryFile): string {
  if (file.kind !== "link") {
    return "Open file";
  }

  const platformLabel = fileLinkPlatformLabel(file);
  if (platformLabel) {
    return `Open in ${platformLabel}`;
  }

  const domain = file.domain ?? "";
  if (domain.length > 0 && domain.length <= 24) {
    return `Open in ${domain}`;
  }

  return "Open link";
}

export function fileLinkDestinationHint(file: MemoryFile): string | undefined {
  if (file.kind !== "link") return undefined;
  if (fileLinkOpenLabel(file) !== "Open link") return undefined;
  return file.domain ?? file.url;
}
