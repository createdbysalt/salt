"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  findOrCreateClient,
  resolveClientFromPerson,
  slugifyProjectName,
} from "@/app/_features/capture/services/system-plays/project-fields";
import type { FileCategory } from "../data";

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

const LinkTargetSchema = z.object({
  kind: z.enum(["person", "org", "work"]),
  id: z.string().uuid(),
});

export type FileLinkTarget = z.infer<typeof LinkTargetSchema>;

export type FileLinkSearchResult = {
  id: string;
  name: string;
  kind: FileLinkTarget["kind"];
  subtitle?: string;
};

async function resolveClientFromOrg(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  orgId: string,
): Promise<string> {
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, migrated_from_client_id")
    .eq("id", orgId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!org) throw new Error("Organization not found");

  if (org.migrated_from_client_id) {
    return org.migrated_from_client_id as string;
  }

  return findOrCreateClient(admin, workspaceId, {
    name: org.name as string,
    slug: slugifyProjectName(org.name as string),
  });
}

export async function searchFileLinkTargets(
  query: string,
): Promise<ActionResult<{ results: FileLinkSearchResult[] }>> {
  try {
    const { workspace } = await getWorkspaceContext();
    const admin = createAdminClient();
    const trimmed = query.trim();
    const pattern = trimmed
      ? `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`
      : undefined;

    const [peopleResult, orgsResult, projectsResult] = await Promise.all([
      (() => {
        let q = admin
          .from("people")
          .select("id, name, relationship_type")
          .eq("workspace_id", workspace.id)
          .is("deleted_at", null)
          .is("archived_at", null)
          .order("name", { ascending: true })
          .limit(8);
        if (pattern) q = q.or(`name.ilike.${pattern},email.ilike.${pattern}`);
        return q;
      })(),
      (() => {
        let q = admin
          .from("organizations")
          .select("id, name, domain")
          .eq("workspace_id", workspace.id)
          .is("deleted_at", null)
          .is("archived_at", null)
          .order("name", { ascending: true })
          .limit(8);
        if (pattern) q = q.or(`name.ilike.${pattern},domain.ilike.${pattern}`);
        return q;
      })(),
      (() => {
        let q = admin
          .from("projects")
          .select("id, name, status")
          .eq("workspace_id", workspace.id)
          .is("archived_at", null)
          .order("name", { ascending: true })
          .limit(8);
        if (pattern) q = q.ilike("name", pattern);
        return q;
      })(),
    ]);

    if (peopleResult.error) throw new Error(peopleResult.error.message);
    if (orgsResult.error) throw new Error(orgsResult.error.message);
    if (projectsResult.error) throw new Error(projectsResult.error.message);

    const results: FileLinkSearchResult[] = [
      ...(peopleResult.data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        kind: "person" as const,
        subtitle: (row.relationship_type as string | null) ?? undefined,
      })),
      ...(orgsResult.data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        kind: "org" as const,
        subtitle: (row.domain as string | null) ?? undefined,
      })),
      ...(projectsResult.data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        kind: "work" as const,
        subtitle: (row.status as string | null) ?? undefined,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return { ok: true, data: { results: results.slice(0, 12) } };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not search memory",
    };
  }
}

export async function updateMemoryFileConnection(
  fileId: string,
  targetInput: FileLinkTarget,
): Promise<ActionResult> {
  try {
    const { workspace } = await getWorkspaceContext();
    const supabase = await createClient();
    const admin = createAdminClient();
    const target = LinkTargetSchema.parse(targetInput);

    let clientId: string;
    let projectId: string | null = null;

    if (target.kind === "person") {
      clientId = await resolveClientFromPerson(admin, workspace.id, target.id);
    } else if (target.kind === "org") {
      clientId = await resolveClientFromOrg(admin, workspace.id, target.id);
    } else {
      const { data: project, error } = await admin
        .from("projects")
        .select("id, client_id, name")
        .eq("id", target.id)
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!project?.client_id) throw new Error("Work item not found");

      clientId = project.client_id as string;
      projectId = project.id as string;
    }

    const { error: updateError } = await supabase
      .from("project_files")
      .update({
        client_id: clientId,
        project_id: projectId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    revalidatePath("/files");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: error.errors[0]?.message ?? "Invalid link target" };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not update connection",
    };
  }
}

export async function archiveMemoryFile(fileId: string): Promise<ActionResult> {
  try {
    const { workspace } = await getWorkspaceContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from("project_files")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .is("archived_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/files");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not archive file",
    };
  }
}

export async function updateMemoryFileCategory(
  fileId: string,
  category: FileCategory,
): Promise<ActionResult> {
  try {
    const { workspace } = await getWorkspaceContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from("project_files")
      .update({ category, updated_at: new Date().toISOString() })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/files");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not update category",
    };
  }
}
