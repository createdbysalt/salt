
/**
 * Projects Feature - Query Functions
 *
 * Data fetching functions for project management.
 * These are read-only operations.
 * Uses React cache() for request deduplication across parallel RSC renders.
 *
 * Usage:
 *   import { getProjectsWithMetrics, getProject } from '@/app/_features/projects/queries'
 */

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";

// =============================================================================
// GET SINGLE PROJECT (Cached)
// =============================================================================

/**
 * Project data returned by getProject.
 * Includes client name and basic project info.
 */
export interface ProjectBasic {
  id: string;
  name: string;
  status: string;
  created_at: string;
  client: { name: string } | null;
}

/**
 * Get a single project by ID with auth context established.
 * Cached for request deduplication - ensures layout and page share the same
 * auth context and project data during parallel RSC rendering.
 *
 * Returns null if project not found or user not authenticated.
 */
export const getProject = cache(
  async (projectId: string): Promise<ProjectBasic | null> => {
    try {
      const supabase = await createClient();

      // Establish auth context for RLS
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: project, error } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          status,
          created_at,
          client:clients(name)
        `
        )
        .eq("id", projectId)
        .single();

      if (error) {
        console.error("Error fetching project:", {
          message: error.message,
          code: error.code,
        });
        return null;
      }

      // Transform Supabase nested select result (returns array for joins)
      const clientData = project.client;
      const transformedProject: ProjectBasic = {
        id: project.id,
        name: project.name,
        status: project.status,
        created_at: project.created_at,
        client: Array.isArray(clientData) ? (clientData[0] || null) : clientData,
      };

      return transformedProject;
    } catch (error) {
      console.error("Unexpected error in getProject:", error);
      return null;
    }
  }
);

/**
 * Project metadata stored in JSONB column.
 */
export interface ProjectMetadata {
  total_value?: number;
  included_hours?: number;
  used_hours?: number;
  deadline?: string;
}

/**
 * Project data returned by getProjectDetail.
 * Extended properties for the project overview page.
 */
export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  created_at: string;
  client_id: string | null;
  start_date: string | null;
  deadline: string | null;
  metadata: ProjectMetadata | null;
  client: {
    id: string;
    name: string;
  } | null;
}

/**
 * Get a single project with extended details for the project overview page.
 * Cached for request deduplication - ensures consistent auth context with layout.
 */
export const getProjectDetail = cache(
  async (projectId: string): Promise<ProjectDetail | null> => {
    try {
      const supabase = await createClient();

      // Establish auth context for RLS
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: project, error } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          status,
          project_type,
          created_at,
          client_id,
          start_date,
          deadline,
          metadata,
          client:clients(id, name)
        `
        )
        .eq("id", projectId)
        .single();

      if (error) {
        console.error("Error fetching project detail:", {
          message: error.message,
          code: error.code,
        });
        return null;
      }

      // Transform Supabase nested select result (returns array for joins)
      const clientData = project.client;
      const transformedProject: ProjectDetail = {
        id: project.id,
        name: project.name,
        status: project.status,
        project_type: project.project_type,
        created_at: project.created_at,
        client_id: project.client_id,
        start_date: project.start_date,
        deadline: project.deadline,
        metadata: project.metadata as ProjectMetadata | null,
        client: Array.isArray(clientData) ? (clientData[0] || null) : clientData,
      };

      return transformedProject;
    } catch (error) {
      console.error("Unexpected error in getProjectDetail:", error);
      return null;
    }
  }
);

// =============================================================================
// Re-exports from actions
// =============================================================================

// Project data fetching
export {
  getProjectsWithMetrics,
  type ProjectWithMetrics,
} from "@/app/actions/projects/get-projects-with-metrics";

// Milestone queries
export { getMilestones } from "@/app/actions/projects/get-milestones";
