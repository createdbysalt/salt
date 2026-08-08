/**
 * Unified Resources Types
 *
 * Resources are first-class nodes in the connection graph.
 * They can be Static (link only) or Live (activity monitoring).
 */

export type ResourceMode = "static" | "live";

export type ResourceType =
  // UPLOADED FILES (Static only)
  | "file"

  // CODE (Live supported)
  | "github_repo"
  | "github_branch"
  | "github_pr"
  | "github_issue"
  | "github_profile"
  | "github_org"
  | "gitlab_repo"
  | "gitlab_mr"
  | "gitlab_profile"
  | "bitbucket_repo"

  // DESIGN (Live supported)
  | "figma_file"
  | "figma_project"
  | "figma_prototype"
  | "canva_design"

  // PROJECT MANAGEMENT (Live supported)
  | "linear_project"
  | "linear_issue"
  | "linear_cycle"
  | "asana_project"
  | "asana_task"
  | "jira_project"
  | "jira_issue"
  | "notion_page"
  | "notion_database"
  | "monday_board"
  | "monday_item"
  | "clickup_task"
  | "clickup_list"

  // CRM (Live supported)
  | "hubspot_deal"
  | "hubspot_contact"
  | "hubspot_company"
  | "salesforce_opportunity"
  | "salesforce_contact"
  | "salesforce_account"
  | "pipedrive_deal"
  | "pipedrive_person"
  | "pipedrive_organization"

  // DOCUMENTS (Live supported)
  | "gdrive_doc"
  | "gdrive_sheet"
  | "gdrive_slide"
  | "gdrive_folder"
  | "dropbox_file"
  | "dropbox_folder"

  // COMMUNICATION (Live supported)
  | "slack_channel"
  | "slack_thread"
  | "discord_channel"

  // MEETINGS/MEDIA (Static typically)
  | "loom_video"
  | "zoom_recording"
  | "fireflies_transcript"
  | "otter_transcript"
  | "youtube_video"
  | "vimeo_video"

  // SOCIAL/PROFESSIONAL (Static, polling-based enrichment)
  | "linkedin_profile"
  | "linkedin_company"
  | "twitter_profile"
  | "twitter_handle"
  | "crunchbase_company"
  | "producthunt_product"

  // SCHEDULING (Static only)
  | "calendly_link"
  | "calcom_link"

  // GENERIC (Static only)
  | "website"
  | "url";

export type ResourceCategory =
  | "file"
  | "code"
  | "design"
  | "project_management"
  | "crm"
  | "documents"
  | "communication"
  | "media"
  | "social"
  | "scheduling"
  | "generic";

export type ResourceSource =
  | "manual"
  | "care"
  | "enrichment"
  | "ask_salt"
  | "capture";

export interface LiveConfig {
  events?: string[];
  branch?: string;
  notify?: boolean;
}

export interface Resource {
  id: string;
  workspaceId: string;
  entityType?: "person" | "org" | "work" | "billing" | "meeting" | "note" | "space" | "operator";
  entityId?: string;
  mode: ResourceMode;
  resourceType: ResourceType;
  resourceUrl?: string;
  resourceId?: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  fileCategory?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storagePath?: string;
  metadata?: Record<string, unknown>;
  liveConfig?: LiveConfig;
  lastActivityAt?: string;
  lastActivitySummary?: string;
  composioTriggerId?: string;
  providerMetadata?: Record<string, unknown>;
  providerMetadataAt?: string;
  source: ResourceSource;
  confidence?: number;
  because?: string;
  personId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetectionResult {
  resourceType: ResourceType;
  category: ResourceCategory;
  resourceId?: string;
  extractedMetadata: Record<string, unknown>;
  supportsLive: boolean;
  suggestedName?: string;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  file: "File",
  github_repo: "GitHub Repository",
  github_branch: "GitHub Branch",
  github_pr: "GitHub Pull Request",
  github_issue: "GitHub Issue",
  github_profile: "GitHub Profile",
  github_org: "GitHub Organization",
  gitlab_repo: "GitLab Repository",
  gitlab_mr: "GitLab Merge Request",
  gitlab_profile: "GitLab Profile",
  bitbucket_repo: "Bitbucket Repository",
  figma_file: "Figma File",
  figma_project: "Figma Project",
  figma_prototype: "Figma Prototype",
  canva_design: "Canva Design",
  linear_project: "Linear Project",
  linear_issue: "Linear Issue",
  linear_cycle: "Linear Cycle",
  asana_project: "Asana Project",
  asana_task: "Asana Task",
  jira_project: "Jira Project",
  jira_issue: "Jira Issue",
  notion_page: "Notion Page",
  notion_database: "Notion Database",
  monday_board: "Monday Board",
  monday_item: "Monday Item",
  clickup_task: "ClickUp Task",
  clickup_list: "ClickUp List",
  hubspot_deal: "HubSpot Deal",
  hubspot_contact: "HubSpot Contact",
  hubspot_company: "HubSpot Company",
  salesforce_opportunity: "Salesforce Opportunity",
  salesforce_contact: "Salesforce Contact",
  salesforce_account: "Salesforce Account",
  pipedrive_deal: "Pipedrive Deal",
  pipedrive_person: "Pipedrive Person",
  pipedrive_organization: "Pipedrive Organization",
  gdrive_doc: "Google Doc",
  gdrive_sheet: "Google Sheet",
  gdrive_slide: "Google Slides",
  gdrive_folder: "Google Drive Folder",
  dropbox_file: "Dropbox File",
  dropbox_folder: "Dropbox Folder",
  slack_channel: "Slack Channel",
  slack_thread: "Slack Thread",
  discord_channel: "Discord Channel",
  loom_video: "Loom Video",
  zoom_recording: "Zoom Recording",
  fireflies_transcript: "Fireflies Transcript",
  otter_transcript: "Otter Transcript",
  youtube_video: "YouTube Video",
  vimeo_video: "Vimeo Video",
  linkedin_profile: "LinkedIn Profile",
  linkedin_company: "LinkedIn Company",
  twitter_profile: "Twitter Profile",
  twitter_handle: "Twitter Handle",
  crunchbase_company: "Crunchbase Company",
  producthunt_product: "Product Hunt Product",
  calendly_link: "Calendly Link",
  calcom_link: "Cal.com Link",
  website: "Website",
  url: "Link",
};

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  file: "Files",
  code: "Code",
  design: "Design",
  project_management: "Project Management",
  crm: "CRM",
  documents: "Documents",
  communication: "Communication",
  media: "Media",
  social: "Social",
  scheduling: "Scheduling",
  generic: "Links",
};

export function getResourceCategory(type: ResourceType): ResourceCategory {
  const categoryMap: Record<ResourceType, ResourceCategory> = {
    file: "file",
    github_repo: "code",
    github_branch: "code",
    github_pr: "code",
    github_issue: "code",
    github_profile: "code",
    github_org: "code",
    gitlab_repo: "code",
    gitlab_mr: "code",
    gitlab_profile: "code",
    bitbucket_repo: "code",
    figma_file: "design",
    figma_project: "design",
    figma_prototype: "design",
    canva_design: "design",
    linear_project: "project_management",
    linear_issue: "project_management",
    linear_cycle: "project_management",
    asana_project: "project_management",
    asana_task: "project_management",
    jira_project: "project_management",
    jira_issue: "project_management",
    notion_page: "project_management",
    notion_database: "project_management",
    monday_board: "project_management",
    monday_item: "project_management",
    clickup_task: "project_management",
    clickup_list: "project_management",
    hubspot_deal: "crm",
    hubspot_contact: "crm",
    hubspot_company: "crm",
    salesforce_opportunity: "crm",
    salesforce_contact: "crm",
    salesforce_account: "crm",
    pipedrive_deal: "crm",
    pipedrive_person: "crm",
    pipedrive_organization: "crm",
    gdrive_doc: "documents",
    gdrive_sheet: "documents",
    gdrive_slide: "documents",
    gdrive_folder: "documents",
    dropbox_file: "documents",
    dropbox_folder: "documents",
    slack_channel: "communication",
    slack_thread: "communication",
    discord_channel: "communication",
    loom_video: "media",
    zoom_recording: "media",
    fireflies_transcript: "media",
    otter_transcript: "media",
    youtube_video: "media",
    vimeo_video: "media",
    linkedin_profile: "social",
    linkedin_company: "social",
    twitter_profile: "social",
    twitter_handle: "social",
    crunchbase_company: "social",
    producthunt_product: "social",
    calendly_link: "scheduling",
    calcom_link: "scheduling",
    website: "generic",
    url: "generic",
  };
  return categoryMap[type];
}
