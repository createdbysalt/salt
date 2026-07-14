/**
 * Resource Metadata Extraction
 *
 * Orchestrates metadata extraction from various providers.
 * Uses public APIs where available, Composio for authenticated data.
 */

import type { ResourceType } from "../types";
import { detectResourceFromUrl } from "../url-detector";
import {
  extractGitHubRepoMetadata,
  extractGitHubPRMetadata,
  extractGitHubIssueMetadata,
} from "./extractors/github";

export interface ResourceMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  provider: string;
  lastUpdated?: string;
  stats?: Record<string, number | string>;
  raw?: Record<string, unknown>;
}

export async function extractResourceMetadata(
  url: string,
  resourceType?: ResourceType
): Promise<ResourceMetadata | null> {
  const detection = resourceType
    ? { resourceType, extractedMetadata: {} }
    : detectResourceFromUrl(url);

  if (!detection) return null;

  const type = detection.resourceType;
  const meta = detection.extractedMetadata as Record<string, unknown>;

  switch (type) {
    case "github_repo": {
      const owner = meta.owner as string;
      const repo = meta.repo as string;
      if (!owner || !repo) return null;

      const data = await extractGitHubRepoMetadata(owner, repo);
      if (!data) return null;

      return {
        title: data.fullName,
        description: data.description,
        provider: "github",
        lastUpdated: data.updatedAt,
        stats: {
          stars: data.stargazersCount,
          forks: data.forksCount,
          issues: data.openIssuesCount,
          language: data.language ?? "Unknown",
        },
        raw: data as unknown as Record<string, unknown>,
      };
    }

    case "github_pr": {
      const owner = meta.owner as string;
      const repo = meta.repo as string;
      const prNumber = meta.prNumber as number;
      if (!owner || !repo || !prNumber) return null;

      const data = await extractGitHubPRMetadata(owner, repo, prNumber);
      if (!data) return null;

      return {
        title: `#${data.prNumber}: ${data.title}`,
        description: `${data.state} by ${data.author}`,
        provider: "github",
        lastUpdated: data.updatedAt,
        stats: {
          additions: data.additions,
          deletions: data.deletions,
          files: data.changedFiles,
          state: data.state,
        },
        raw: data as unknown as Record<string, unknown>,
      };
    }

    case "github_issue": {
      const owner = meta.owner as string;
      const repo = meta.repo as string;
      const issueNumber = meta.issueNumber as number;
      if (!owner || !repo || !issueNumber) return null;

      const data = await extractGitHubIssueMetadata(owner, repo, issueNumber);
      if (!data) return null;

      return {
        title: `#${data.issueNumber}: ${data.title}`,
        description: `${data.state} by ${data.author}`,
        provider: "github",
        lastUpdated: data.updatedAt,
        stats: {
          comments: data.commentsCount,
          state: data.state,
          labels: data.labels.join(", ") || "None",
        },
        raw: data as unknown as Record<string, unknown>,
      };
    }

    case "figma_file":
    case "figma_project":
    case "figma_prototype":
      return {
        title: (meta.fileName as string) ?? "Figma File",
        provider: "figma",
      };

    case "linear_issue":
      return {
        title: meta.issueId as string,
        provider: "linear",
      };

    case "linear_project":
      return {
        title: (meta.projectSlug as string)?.replace(/-/g, " ") ?? "Linear Project",
        provider: "linear",
      };

    case "gdrive_doc":
      return {
        title: "Google Doc",
        provider: "google",
      };

    case "gdrive_sheet":
      return {
        title: "Google Sheet",
        provider: "google",
      };

    case "gdrive_slide":
      return {
        title: "Google Slides",
        provider: "google",
      };

    case "notion_page":
      return {
        title: (meta.pageSlug as string)?.replace(/-/g, " ") ?? "Notion Page",
        provider: "notion",
      };

    case "linkedin_profile":
      return {
        title: (meta.handle as string)?.replace(/-/g, " ") ?? "LinkedIn Profile",
        provider: "linkedin",
      };

    case "linkedin_company":
      return {
        title: (meta.slug as string)?.replace(/-/g, " ") ?? "LinkedIn Company",
        provider: "linkedin",
      };

    case "loom_video":
      return {
        title: "Loom Recording",
        provider: "loom",
      };

    case "youtube_video":
      return {
        title: "YouTube Video",
        provider: "youtube",
      };

    case "slack_channel":
      return {
        title: `#${meta.channelId}`,
        description: `${meta.workspace} workspace`,
        provider: "slack",
      };

    default:
      return {
        provider: "unknown",
      };
  }
}

export async function refreshProviderMetadata(
  resourceId: string,
  resourceUrl: string,
  resourceType: ResourceType
): Promise<Record<string, unknown> | null> {
  const metadata = await extractResourceMetadata(resourceUrl, resourceType);
  if (!metadata?.raw) return null;
  return metadata.raw;
}
