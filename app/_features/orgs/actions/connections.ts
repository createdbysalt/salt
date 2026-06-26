"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { linkPersonToOrganization } from "@/app/_features/relationships/entity-actions";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

export async function persistOrgConnection(input: {
  orgId: string;
  connection: Connection;
}): Promise<{ success: boolean; error?: string }> {
  const { workspace, supabase } = await getWorkspaceContext();

  if (input.connection.type === "person") {
    const result = await linkPersonToOrganization(
      input.connection.id,
      input.orgId,
      input.connection.subtitle,
      false,
    );
    if (!result.success) return { success: false, error: result.error };
    revalidatePath(`/orgs/${input.orgId}`);
    return { success: true };
  }

  const isFromOrg = true;
  const payload = isFromOrg
    ? {
        workspace_id: workspace.id,
        from_entity_type: "organization",
        from_entity_id: input.orgId,
        to_entity_type: input.connection.type === "work" ? "project" : "organization",
        to_entity_id: input.connection.id,
        relation_type: "related_to",
      }
    : {
        workspace_id: workspace.id,
        from_entity_type: input.connection.type === "work" ? "project" : "organization",
        from_entity_id: input.connection.id,
        to_entity_type: "organization",
        to_entity_id: input.orgId,
        relation_type: "related_to",
      };

  const { error } = await supabase.from("entity_relations").insert(payload);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/orgs/${input.orgId}`);
  revalidatePath("/connections");
  return { success: true };
}

export async function createOrgNote(input: {
  orgId: string;
  orgName: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  const { workspace, supabase, userId } = await getWorkspaceContext();
  const body = input.content.trim();
  if (!body) return { success: false, error: "Note cannot be empty" };

  const content = body.includes(`[[${input.orgName}]]`) ? body : `${body}\n\n[[${input.orgName}]]`;

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      workspace_id: workspace.id,
      content,
      author_type: "user",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !note) {
    return { success: false, error: error?.message ?? "Failed to create note" };
  }

  await supabase.from("entity_relations").insert({
    workspace_id: workspace.id,
    from_entity_type: "note",
    from_entity_id: note.id,
    to_entity_type: "organization",
    to_entity_id: input.orgId,
    relation_type: "mentioned_in",
  });

  revalidatePath(`/orgs/${input.orgId}`);
  revalidatePath("/me");
  return { success: true };
}
