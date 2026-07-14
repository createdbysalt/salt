/**
 * Resource Type Icons
 *
 * Maps resource types to Lucide icons for consistent display.
 */

import {
  Calendar,
  CheckSquare,
  Database,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Github,
  Globe,
  Hash,
  Kanban,
  Link,
  Linkedin,
  Presentation,
  Twitter,
  Video,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { ResourceType } from "./types";

export const RESOURCE_TYPE_ICONS: Record<ResourceType, LucideIcon> = {
  // Code
  github_repo: Github,
  github_branch: Github,
  github_pr: Github,
  github_issue: Github,
  github_profile: Github,
  github_org: Github,
  gitlab_repo: Github,
  gitlab_mr: Github,
  gitlab_profile: Github,
  bitbucket_repo: Github,

  // Design (Figma icon not in Lucide - use Kanban as placeholder)
  figma_file: Kanban,
  figma_project: Kanban,
  figma_prototype: Kanban,
  canva_design: Kanban,

  // Project Management
  linear_project: Kanban,
  linear_issue: CheckSquare,
  linear_cycle: Kanban,
  asana_project: Kanban,
  asana_task: CheckSquare,
  jira_project: Kanban,
  jira_issue: CheckSquare,
  notion_page: FileText,
  notion_database: Database,
  monday_board: Kanban,
  monday_item: CheckSquare,
  clickup_task: CheckSquare,
  clickup_list: Kanban,

  // CRM
  hubspot_deal: Kanban,
  hubspot_contact: File,
  hubspot_company: File,
  salesforce_opportunity: Kanban,
  salesforce_contact: File,
  salesforce_account: File,
  pipedrive_deal: Kanban,
  pipedrive_person: File,
  pipedrive_organization: File,

  // Google / Documents
  gdrive_doc: FileText,
  gdrive_sheet: FileSpreadsheet,
  gdrive_slide: Presentation,
  gdrive_folder: FolderOpen,
  dropbox_file: File,
  dropbox_folder: FolderOpen,

  // Communication
  slack_channel: Hash,
  slack_thread: Hash,
  discord_channel: Hash,

  // Video / Media
  loom_video: Video,
  zoom_recording: Video,
  fireflies_transcript: FileText,
  otter_transcript: FileText,
  youtube_video: Youtube,
  vimeo_video: Video,

  // Social
  linkedin_profile: Linkedin,
  linkedin_company: Linkedin,
  twitter_profile: Twitter,
  twitter_handle: Twitter,
  crunchbase_company: Globe,
  producthunt_product: Globe,

  // Scheduling
  calendly_link: Calendar,
  calcom_link: Calendar,

  // Generic
  website: Globe,
  url: Link,
  file: File,
};

export function getResourceIcon(resourceType: ResourceType): LucideIcon {
  return RESOURCE_TYPE_ICONS[resourceType] ?? Link;
}
