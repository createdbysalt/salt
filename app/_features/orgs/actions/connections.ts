"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { linkPersonToOrganization } from "@/app/_features/relationships/entity-actions";
import { upsertEdge, type EdgeEntityType } from "@/app/_features/memory/lib/edge-store";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

function getEntityPath(type: string, id: string): string {
  switch (type) {
    case "person":
      return `/people/${id}`;
    case "org":
      return `/orgs/${id}`;
    case "work":
      return `/work/${id}`;
    case "billing":
      return `/billing/${id}`;
    case "meeting":
      return `/meetings/${id}`;
    default:
      return "";
  }
}

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
    // Revalidate both org and person pages for bidirectional visibility
    revalidatePath(`/orgs/${input.orgId}`);
    revalidatePath(`/people/${input.connection.id}`);
    return { success: true };
  }

  if (input.connection.type === "conversation") {
    return { success: false, error: "Conversations are automatically linked to their participants" };
  }

  const result = await upsertEdge(supabase, {
    workspaceId: workspace.id,
    source: { type: "org", id: input.orgId },
    target: { type: input.connection.type as EdgeEntityType, id: input.connection.id },
    relationType: "related",
    provenance: { source: "manual" },
  });

  if (!result.ok) {
    return { success: false, error: result.message };
  }

  // Revalidate both org and target entity pages for bidirectional visibility
  revalidatePath(`/orgs/${input.orgId}`);
  const targetPath = getEntityPath(input.connection.type, input.connection.id);
  if (targetPath) revalidatePath(targetPath);
  revalidatePath("/memory");
  return { success: true };
}
