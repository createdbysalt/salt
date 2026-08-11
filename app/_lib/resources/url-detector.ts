/**
 * URL Detection Service
 *
 * Detects resource type from URLs and extracts provider-specific metadata.
 * Used by AddResourceDialog to auto-detect pasted URLs.
 */

import type { ResourceType, ResourceCategory, ResourceDetectionResult } from "./types";
import { getResourceCategory } from "./types";

interface UrlPattern {
  pattern: RegExp;
  type: ResourceType;
  extract: (match: RegExpMatchArray) => Record<string, unknown>;
  suggestName?: (match: RegExpMatchArray) => string;
}

const URL_PATTERNS: UrlPattern[] = [
  // GitHub
  {
    pattern: /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/,
    type: "github_repo",
    extract: (m) => ({ owner: m[1], repo: m[2] }),
    suggestName: (m) => `${m[1]}/${m[2]}`,
  },
  {
    pattern: /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
    type: "github_pr",
    extract: (m) => ({ owner: m[1], repo: m[2], prNumber: parseInt(m[3], 10) }),
    suggestName: (m) => `${m[1]}/${m[2]} #${m[3]}`,
  },
  {
    pattern: /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/,
    type: "github_issue",
    extract: (m) => ({ owner: m[1], repo: m[2], issueNumber: parseInt(m[3], 10) }),
    suggestName: (m) => `${m[1]}/${m[2]} #${m[3]}`,
  },
  {
    pattern: /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)/,
    type: "github_branch",
    extract: (m) => ({ owner: m[1], repo: m[2], branch: m[3] }),
    suggestName: (m) => `${m[1]}/${m[2]}:${m[3]}`,
  },
  {
    pattern: /^https?:\/\/github\.com\/([^/]+)\/?$/,
    type: "github_org",
    extract: (m) => ({ org: m[1] }),
    suggestName: (m) => m[1],
  },

  // GitLab
  {
    pattern: /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/?$/,
    type: "gitlab_repo",
    extract: (m) => ({ namespace: m[1], project: m[2] }),
    suggestName: (m) => `${m[1]}/${m[2]}`,
  },
  {
    pattern: /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/merge_requests\/(\d+)/,
    type: "gitlab_mr",
    extract: (m) => ({ namespace: m[1], project: m[2], mrNumber: parseInt(m[3], 10) }),
    suggestName: (m) => `${m[1]}/${m[2]} !${m[3]}`,
  },

  // Figma
  {
    pattern: /^https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)(?:\/([^?]+))?/,
    type: "figma_file",
    extract: (m) => ({ fileKey: m[1], fileName: m[2] ? decodeURIComponent(m[2].replace(/-/g, " ")) : undefined }),
    suggestName: (m) => m[2] ? decodeURIComponent(m[2].replace(/-/g, " ")) : `Figma ${m[1].slice(0, 8)}`,
  },
  {
    pattern: /^https?:\/\/(?:www\.)?figma\.com\/proto\/([a-zA-Z0-9]+)/,
    type: "figma_prototype",
    extract: (m) => ({ fileKey: m[1] }),
    suggestName: (m) => `Prototype ${m[1].slice(0, 8)}`,
  },

  // Linear
  {
    pattern: /^https?:\/\/linear\.app\/([^/]+)\/issue\/([A-Z]+-\d+)/,
    type: "linear_issue",
    extract: (m) => ({ team: m[1], issueId: m[2] }),
    suggestName: (m) => m[2],
  },
  {
    pattern: /^https?:\/\/linear\.app\/([^/]+)\/project\/([^/]+)/,
    type: "linear_project",
    extract: (m) => ({ team: m[1], projectSlug: m[2] }),
    suggestName: (m) => decodeURIComponent(m[2].replace(/-/g, " ")),
  },

  // Google Docs/Drive
  {
    pattern: /^https?:\/\/docs\.google\.com\/document\/d\/([^/]+)/,
    type: "gdrive_doc",
    extract: (m) => ({ docId: m[1] }),
    suggestName: () => "Google Doc",
  },
  {
    pattern: /^https?:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)/,
    type: "gdrive_sheet",
    extract: (m) => ({ sheetId: m[1] }),
    suggestName: () => "Google Sheet",
  },
  {
    pattern: /^https?:\/\/docs\.google\.com\/presentation\/d\/([^/]+)/,
    type: "gdrive_slide",
    extract: (m) => ({ slideId: m[1] }),
    suggestName: () => "Google Slides",
  },
  {
    pattern: /^https?:\/\/drive\.google\.com\/(?:file\/d|open\?id=)([^/&]+)/,
    type: "gdrive_folder",
    extract: (m) => ({ fileId: m[1] }),
    suggestName: () => "Google Drive File",
  },
  {
    pattern: /^https?:\/\/drive\.google\.com\/drive\/folders\/([^/?]+)/,
    type: "gdrive_folder",
    extract: (m) => ({ folderId: m[1] }),
    suggestName: () => "Google Drive Folder",
  },

  // Notion
  {
    pattern: /^https?:\/\/(?:www\.)?notion\.so\/(?:[^/]+\/)?([a-f0-9]{32})/,
    type: "notion_page",
    extract: (m) => ({ pageId: m[1] }),
    suggestName: () => "Notion Page",
  },
  {
    pattern: /^https?:\/\/(?:www\.)?notion\.so\/([^/]+)\/([^?]+)/,
    type: "notion_page",
    extract: (m) => ({ workspace: m[1], pageSlug: m[2] }),
    suggestName: (m) => decodeURIComponent(m[2].replace(/-[a-f0-9]{32}$/, "").replace(/-/g, " ")),
  },

  // Slack
  {
    pattern: /^https?:\/\/([^.]+)\.slack\.com\/archives\/([A-Z0-9]+)/,
    type: "slack_channel",
    extract: (m) => ({ workspace: m[1], channelId: m[2] }),
    suggestName: (m) => `#${m[2]}`,
  },

  // LinkedIn
  {
    pattern: /^https?:\/\/(?:www\.)?linkedin\.com\/in\/([^/?]+)/,
    type: "linkedin_profile",
    extract: (m) => ({ handle: m[1] }),
    suggestName: (m) => m[1].replace(/-/g, " "),
  },
  {
    pattern: /^https?:\/\/(?:www\.)?linkedin\.com\/company\/([^/?]+)/,
    type: "linkedin_company",
    extract: (m) => ({ slug: m[1] }),
    suggestName: (m) => m[1].replace(/-/g, " "),
  },

  // Video platforms
  {
    pattern: /^https?:\/\/(?:www\.)?loom\.com\/share\/([a-f0-9]+)/,
    type: "loom_video",
    extract: (m) => ({ videoId: m[1] }),
    suggestName: () => "Loom Recording",
  },
  {
    pattern: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    type: "youtube_video",
    extract: (m) => ({ videoId: m[1] }),
    suggestName: () => "YouTube Video",
  },
  {
    pattern: /^https?:\/\/youtu\.be\/([^?]+)/,
    type: "youtube_video",
    extract: (m) => ({ videoId: m[1] }),
    suggestName: () => "YouTube Video",
  },
  {
    pattern: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
    type: "vimeo_video",
    extract: (m) => ({ videoId: m[1] }),
    suggestName: () => "Vimeo Video",
  },

  // Scheduling
  {
    pattern: /^https?:\/\/calendly\.com\/([^/?]+)/,
    type: "calendly_link",
    extract: (m) => ({ user: m[1] }),
    suggestName: (m) => `Calendly - ${m[1]}`,
  },
  {
    pattern: /^https?:\/\/cal\.com\/([^/?]+)/,
    type: "calcom_link",
    extract: (m) => ({ user: m[1] }),
    suggestName: (m) => `Cal.com - ${m[1]}`,
  },

  // Asana
  {
    pattern: /^https?:\/\/app\.asana\.com\/0\/(\d+)\/(\d+)/,
    type: "asana_task",
    extract: (m) => ({ projectId: m[1], taskId: m[2] }),
    suggestName: () => "Asana Task",
  },
  {
    pattern: /^https?:\/\/app\.asana\.com\/0\/(\d+)/,
    type: "asana_project",
    extract: (m) => ({ projectId: m[1] }),
    suggestName: () => "Asana Project",
  },

  // Jira
  {
    pattern: /^https?:\/\/([^.]+)\.atlassian\.net\/browse\/([A-Z]+-\d+)/,
    type: "jira_issue",
    extract: (m) => ({ domain: m[1], issueKey: m[2] }),
    suggestName: (m) => m[2],
  },

  // ClickUp
  {
    pattern: /^https?:\/\/app\.clickup\.com\/t\/([a-z0-9]+)/,
    type: "clickup_task",
    extract: (m) => ({ taskId: m[1] }),
    suggestName: () => "ClickUp Task",
  },

  // Dropbox
  {
    pattern: /^https?:\/\/(?:www\.)?dropbox\.com\/(?:s|sh|scl)\/([^/?]+)/,
    type: "dropbox_file",
    extract: (m) => ({ shareId: m[1] }),
    suggestName: () => "Dropbox File",
  },

  // Meeting intelligence
  {
    pattern: /^https?:\/\/(?:app\.)?fireflies\.ai\/view\/([^/?]+)/,
    type: "fireflies_transcript",
    extract: (m) => ({ transcriptSlug: m[1] }),
    suggestName: (m) => {
      const title = m[1].split("::")[0];
      return title ? decodeURIComponent(title.replace(/-/g, " ")) : "Fireflies Transcript";
    },
  },
  {
    pattern: /^https?:\/\/(?:www\.)?otter\.ai\/u\/([^/?]+)/,
    type: "otter_transcript",
    extract: (m) => ({ conversationId: m[1] }),
    suggestName: () => "Otter Conversation",
  },

  // Twitter/X
  {
    pattern: /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([^/?]+)/,
    type: "twitter_profile",
    extract: (m) => ({ handle: m[1] }),
    suggestName: (m) => `@${m[1]}`,
  },
];

const LIVE_ELIGIBLE_TYPES = new Set<ResourceType>([
  "github_repo",
  "github_pr",
  "github_issue",
  "github_branch",
  "linear_project",
  "linear_issue",
  "slack_channel",
  "gdrive_doc",
  "gdrive_sheet",
  "gdrive_folder",
  "figma_file",
  "figma_project",
  "notion_page",
  "notion_database",
  "hubspot_deal",
  "hubspot_contact",
]);

export function detectResourceFromUrl(url: string): ResourceDetectionResult | null {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;

  try {
    new URL(trimmedUrl);
  } catch {
    return null;
  }

  for (const { pattern, type, extract, suggestName } of URL_PATTERNS) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      return {
        resourceType: type,
        category: getResourceCategory(type),
        resourceId: buildResourceId(type, extract(match)),
        extractedMetadata: extract(match),
        supportsLive: LIVE_ELIGIBLE_TYPES.has(type),
        suggestedName: suggestName?.(match),
      };
    }
  }

  const hostname = extractHostname(trimmedUrl);
  if (hostname) {
    return {
      resourceType: "website",
      category: "generic",
      extractedMetadata: { hostname },
      supportsLive: false,
      suggestedName: hostname,
    };
  }

  return {
    resourceType: "url",
    category: "generic",
    extractedMetadata: {},
    supportsLive: false,
  };
}

function buildResourceId(type: ResourceType, metadata: Record<string, unknown>): string | undefined {
  switch (type) {
    case "github_repo":
    case "github_branch":
      return `${metadata.owner}/${metadata.repo}`;
    case "github_pr":
      return `${metadata.owner}/${metadata.repo}/pull/${metadata.prNumber}`;
    case "github_issue":
      return `${metadata.owner}/${metadata.repo}/issues/${metadata.issueNumber}`;
    case "github_org":
      return String(metadata.org);
    case "figma_file":
    case "figma_prototype":
      return String(metadata.fileKey);
    case "linear_issue":
      return String(metadata.issueId);
    case "linear_project":
      return `${metadata.team}/${metadata.projectSlug}`;
    case "gdrive_doc":
      return String(metadata.docId);
    case "gdrive_sheet":
      return String(metadata.sheetId);
    case "gdrive_slide":
      return String(metadata.slideId);
    case "gdrive_folder":
      return String(metadata.folderId ?? metadata.fileId);
    case "notion_page":
      return String(metadata.pageId ?? metadata.pageSlug);
    case "slack_channel":
      return `${metadata.workspace}/${metadata.channelId}`;
    case "linkedin_profile":
      return String(metadata.handle);
    case "linkedin_company":
      return String(metadata.slug);
    case "loom_video":
    case "youtube_video":
    case "vimeo_video":
      return String(metadata.videoId);
    default:
      return undefined;
  }
}

function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function canBeLive(resourceType: ResourceType): boolean {
  return LIVE_ELIGIBLE_TYPES.has(resourceType);
}

export function isExternalResource(resourceType: ResourceType): boolean {
  return resourceType !== "file";
}
