"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

export interface FileTag {
  id: string;
  label: string;
  color: string;
  isSystem: boolean;
}

export interface ClientFile {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  direction: "from_client" | "to_client" | "internal";
  sharedWithClient: boolean;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
  tags: FileTag[];
}

export interface GetClientFilesResult {
  files: ClientFile[];
  projects: Array<{ id: string; name: string }>;
  availableTags: FileTag[];
}

export async function getClientFiles(clientId: string): Promise<GetClientFilesResult> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // Get all files for this client
  const { data: files, error: filesError } = await supabase
    .from("project_files")
    .select(`
      id,
      file_name,
      mime_type,
      size_bytes,
      direction,
      shared_with_client,
      description,
      project_id,
      uploaded_by,
      created_at,
      project:projects(id, name)
    `)
    .eq("studio_id", studio.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (filesError) {
    console.error("Error fetching client files:", filesError);
    return { files: [], projects: [], availableTags: [] };
  }

  // Get tag assignments for these files
  const fileIds = (files || []).map((f) => f.id);
  const { data: tagAssignments } = await supabase
    .from("file_tag_assignments")
    .select(`
      file_id,
      tag:file_tags(id, label, color, is_system)
    `)
    .in("file_id", fileIds.length > 0 ? fileIds : ["00000000-0000-0000-0000-000000000000"]);

  // Get uploader names
  const uploaderIds = [...new Set((files || []).map((f) => f.uploaded_by))];
  const { data: uploaders } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", uploaderIds.length > 0 ? uploaderIds : ["00000000-0000-0000-0000-000000000000"]);

  const uploaderMap = new Map(
    (uploaders || []).map((u) => [u.id, u.full_name || u.email || "Unknown"])
  );

  // Group tags by file
  const tagsByFile = new Map<string, FileTag[]>();
  (tagAssignments || []).forEach((ta: any) => {
    if (ta.tag) {
      const existing = tagsByFile.get(ta.file_id) || [];
      existing.push({
        id: ta.tag.id,
        label: ta.tag.label,
        color: ta.tag.color,
        isSystem: ta.tag.is_system,
      });
      tagsByFile.set(ta.file_id, existing);
    }
  });

  // Get all projects for this client (for filter dropdown)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("studio_id", studio.id)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("name");

  // Get available tags (system + studio custom)
  const { data: availableTagsData } = await supabase
    .from("file_tags")
    .select("id, label, color, is_system")
    .or(`studio_id.eq.${studio.id},and(is_system.eq.true,studio_id.is.null)`)
    .order("display_order");

  const availableTags: FileTag[] = (availableTagsData || []).map((t) => ({
    id: t.id,
    label: t.label,
    color: t.color,
    isSystem: t.is_system,
  }));

  // Transform files
  const transformedFiles: ClientFile[] = (files || []).map((f: any) => ({
    id: f.id,
    fileName: f.file_name,
    mimeType: f.mime_type,
    sizeBytes: f.size_bytes,
    direction: f.direction || "internal",
    sharedWithClient: f.shared_with_client || false,
    description: f.description,
    projectId: f.project_id,
    projectName: f.project?.name || null,
    uploadedBy: f.uploaded_by,
    uploadedByName: uploaderMap.get(f.uploaded_by) || "Unknown",
    createdAt: f.created_at,
    tags: tagsByFile.get(f.id) || [],
  }));

  return {
    files: transformedFiles,
    projects: (projects || []).map((p) => ({ id: p.id, name: p.name })),
    availableTags,
  };
}
