"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";

interface SearchResult {
  id: string;
  type: "project" | "request" | "file";
  title: string;
  description?: string;
  url: string;
  metadata?: any;
}

export async function searchBridgeContent(query: string): Promise<SearchResult[]> {
  const { context } = await getTenantContext();
  
  if (!context.client) {
    return [];
  }

  const supabase = await createClient();
  const results: SearchResult[] = [];

  try {
    // Search projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description, status")
      .eq("client_id", context.client.id)
      .ilike("name", `%${query}%`);

    if (projects) {
      results.push(
        ...projects.map((project) => ({
          id: project.id,
          type: "project" as const,
          title: project.name,
          description: project.description || undefined,
          url: `/bridge/projects/${project.id}`,
          metadata: { status: project.status },
        }))
      );
    }

    // Search requests/tasks
    const { data: requests } = await supabase
      .from("tasks")
      .select("id, title, description, status")
      .eq("client_id", context.client.id)
      .eq("source", "client_request")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10);

    if (requests) {
      results.push(
        ...requests.map((request) => ({
          id: request.id,
          type: "request" as const,
          title: request.title,
          description: request.description || undefined,
          url: `/bridge/requests`,
          metadata: { status: request.status },
        }))
      );
    }

    // Search files
    const { data: files } = await supabase
      .from("project_files")
      .select("id, file_name, category, project_id")
      .eq("client_id", context.client.id)
      .ilike("file_name", `%${query}%`)
      .limit(10);

    if (files) {
      results.push(
        ...files.map((file) => ({
          id: file.id,
          type: "file" as const,
          title: file.file_name,
          description: `${file.category} file`,
          url: `/bridge/files`,
          metadata: { category: file.category },
        }))
      );
    }

    return results;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

