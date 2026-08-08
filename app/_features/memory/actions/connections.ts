"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { updateMemoryFileConnection } from "@/app/_features/files/actions/file-actions";
import {
  deleteEdgeBetween,
  upsertEdge,
  type EdgeEntityType,
} from "@/app/_features/memory/lib/edge-store";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

export type LinkCandidateType =
  | "person"
  | "org"
  | "work"
  | "billing"
  | "conversation"
  | "meeting"
  | "file";

export type LinkCandidate = {
  id: string;
  name: string;
  type: LinkCandidateType;
  subtitle?: string;
};

type FetchCandidatesInput = {
  recordKind: "person" | "org" | "work" | "billing" | "meeting" | "file";
  recordId: string;
  existingConnections: Array<{ id: string; type: string }>;
};

const CANDIDATE_LIMIT = 200;

export async function fetchLinkCandidates(
  input: FetchCandidatesInput
): Promise<LinkCandidate[]> {
  const { workspace } = await getWorkspaceContext();
  const supabase = await createClient();

  const existingKeys = new Set(
    input.existingConnections.map((c) => `${c.type}:${c.id}`)
  );

  const [peopleResult, orgsResult, workResult, billingResult, conversationsResult, meetingsResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, title")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("name")
      .limit(CANDIDATE_LIMIT),
    supabase
      .from("organizations")
      .select("id, name, industry")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("name")
      .limit(CANDIDATE_LIMIT),
    supabase
      .from("work")
      .select("id, name, status")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("name")
      .limit(CANDIDATE_LIMIT),
    supabase
      .from("billing_records")
      .select("id, number, amount_cents, currency, direction, status")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(CANDIDATE_LIMIT),
    supabase
      .from("conversations")
      .select("id, last_message_preview, created_at")
      .order("last_message_at", { ascending: false })
      .limit(CANDIDATE_LIMIT),
    supabase
      .from("meetings")
      .select("id, title, start_time, status")
      .order("start_time", { ascending: false })
      .limit(CANDIDATE_LIMIT),
  ]);

  const candidates: LinkCandidate[] = [];

  for (const person of peopleResult.data ?? []) {
    if (input.recordKind === "person" && person.id === input.recordId) continue;
    if (existingKeys.has(`person:${person.id}`)) continue;
    candidates.push({
      id: person.id,
      name: person.name,
      type: "person",
      subtitle: person.title ?? undefined,
    });
  }

  for (const org of orgsResult.data ?? []) {
    if (input.recordKind === "org" && org.id === input.recordId) continue;
    if (existingKeys.has(`org:${org.id}`)) continue;
    candidates.push({
      id: org.id,
      name: org.name,
      type: "org",
      subtitle: org.industry ?? undefined,
    });
  }

  for (const work of workResult.data ?? []) {
    if (input.recordKind === "work" && work.id === input.recordId) continue;
    if (existingKeys.has(`work:${work.id}`)) continue;
    candidates.push({
      id: work.id,
      name: work.name,
      type: "work",
      subtitle: work.status ?? undefined,
    });
  }

  for (const billing of billingResult.data ?? []) {
    if (existingKeys.has(`billing:${billing.id}`)) continue;
    const label = billing.number || `${billing.direction === "receivable" ? "INV" : "BILL"}-${billing.id.slice(0, 6)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: billing.currency.toUpperCase(),
    }).format(billing.amount_cents / 100);
    candidates.push({
      id: billing.id,
      name: label,
      type: "billing",
      subtitle: `${amount} · ${billing.status}`,
    });
  }

  for (const convo of conversationsResult.data ?? []) {
    if (existingKeys.has(`conversation:${convo.id}`)) continue;
    candidates.push({
      id: convo.id,
      name: convo.last_message_preview?.slice(0, 50) || "Conversation",
      type: "conversation",
      subtitle: new Date(convo.created_at).toLocaleDateString(),
    });
  }

  for (const meeting of meetingsResult.data ?? []) {
    if (existingKeys.has(`meeting:${meeting.id}`)) continue;
    candidates.push({
      id: meeting.id,
      name: meeting.title,
      type: "meeting",
      subtitle: `${new Date(meeting.start_time).toLocaleDateString()} · ${meeting.status}`,
    });
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

type PersistConnectionInput = {
  recordKind: "person" | "org" | "work" | "billing" | "meeting" | "file";
  recordId: string;
  connection: Connection;
};

function getEntityPath(type: LinkCandidateType, id: string): string {
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
    case "conversation":
      return `/conversations/${id}`;
    case "file":
      return `/files?preview=${id}`;
    default:
      return "";
  }
}

export async function persistMemoryConnection(
  input: PersistConnectionInput
): Promise<{ success: boolean; error?: string }> {
  const { workspace } = await getWorkspaceContext();
  const supabase = await createClient();

  const connectionType = input.connection.type as LinkCandidateType;

  if (connectionType === "billing") {
    // Linking TO a billing record - update the billing record's FK
    const updateData: Record<string, string> = {};
    if (input.recordKind === "person") updateData.person_id = input.recordId;
    else if (input.recordKind === "org") updateData.organization_id = input.recordId;
    else if (input.recordKind === "work") updateData.work_id = input.recordId;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("billing_records")
        .update(updateData)
        .eq("id", input.connection.id)
        .eq("workspace_id", workspace.id);

      if (error) {
        console.error("Failed to link billing record:", error);
        return { success: false, error: error.message };
      }

      // Revalidate both source and target paths for bidirectional visibility
      const sourcePath = getEntityPath(input.recordKind, input.recordId);
      const targetPath = getEntityPath(connectionType, input.connection.id);
      if (sourcePath) revalidatePath(sourcePath);
      if (targetPath) revalidatePath(targetPath);
      return { success: true };
    }
  } else if (input.recordKind === "billing") {
    // Linking FROM a billing record to another entity — explicit edge
    if (connectionType === "conversation") {
      return { success: false, error: "Conversations are automatically linked to their participants" };
    }

    const result = await upsertEdge(supabase, {
      workspaceId: workspace.id,
      source: { type: "billing", id: input.recordId },
      target: { type: connectionType, id: input.connection.id },
      relationType: "related",
      provenance: { source: "manual" },
    });

    if (!result.ok) {
      console.error("Failed to persist billing connection:", result.message);
      return { success: false, error: result.message };
    }

    const sourcePath = getEntityPath(input.recordKind, input.recordId);
    const targetPath = getEntityPath(connectionType, input.connection.id);
    if (sourcePath) revalidatePath(sourcePath);
    if (targetPath) revalidatePath(targetPath);
    return { success: true };
  } else if (connectionType === "meeting") {
    if (input.recordKind === "work") {
      const { error } = await supabase
        .from("meetings")
        .update({ work_id: input.recordId })
        .eq("id", input.connection.id);

      if (error) {
        console.error("Failed to link meeting:", error);
        return { success: false, error: error.message };
      }

      // Revalidate both work and meeting pages
      const sourcePath = getEntityPath(input.recordKind, input.recordId);
      const targetPath = getEntityPath(connectionType, input.connection.id);
      if (sourcePath) revalidatePath(sourcePath);
      if (targetPath) revalidatePath(targetPath);
      return { success: true };
    } else {
      return { success: false, error: "Meetings can only be linked to work items" };
    }
  } else if (connectionType === "conversation") {
    return { success: false, error: "Conversations are automatically linked to their participants" };
  } else if (input.recordKind === "file") {
    if (connectionType === "person" || connectionType === "org" || connectionType === "work") {
      const linkResult = await upsertEdge(supabase, {
        workspaceId: workspace.id,
        source: { type: "file", id: input.recordId },
        target: { type: connectionType, id: input.connection.id },
        relationType: "attachment",
        provenance: { source: "manual" },
      });

      if (!linkResult.ok) {
        console.error("Failed to link file connection:", linkResult.message);
        return { success: false, error: linkResult.message };
      }

      const legacyResult = await updateMemoryFileConnection(input.recordId, {
        kind: connectionType,
        id: input.connection.id,
      });

      if (!legacyResult.ok) {
        console.error("Failed to sync file legacy connection:", legacyResult.message);
        return { success: false, error: legacyResult.message };
      }

      revalidatePath("/files");
      return { success: true };
    }

    return {
      success: false,
      error: "Files can only be linked to people, organizations, or work items",
    };
  } else {
    // Generic explicit edge between memory records (short dialect throughout)
    const result = await upsertEdge(supabase, {
      workspaceId: workspace.id,
      source: { type: input.recordKind, id: input.recordId },
      target: { type: connectionType as EdgeEntityType, id: input.connection.id },
      relationType: "related",
      provenance: { source: "manual" },
    });

    if (!result.ok) {
      console.error("Failed to persist connection:", result.message);
      return { success: false, error: result.message };
    }
  }

  // Revalidate both source and target paths for bidirectional visibility
  const sourcePath = getEntityPath(input.recordKind, input.recordId);
  const targetPath = getEntityPath(connectionType, input.connection.id);
  if (sourcePath) revalidatePath(sourcePath);
  if (targetPath) revalidatePath(targetPath);

  return { success: true };
}

type RemoveConnectionInput = {
  recordKind: "person" | "org" | "work" | "billing" | "meeting" | "file";
  recordId: string;
  connectionType: LinkCandidateType;
  connectionId: string;
};

export async function removeMemoryConnection(
  input: RemoveConnectionInput
): Promise<{ success: boolean; error?: string }> {
  const { workspace } = await getWorkspaceContext();
  const supabase = await createClient();

  if (input.recordKind === "file") {
    if (
      input.connectionType === "person" ||
      input.connectionType === "org" ||
      input.connectionType === "work"
    ) {
      const { error: linkError } = await supabase
        .from("entity_links")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("source_type", "file")
        .eq("source_id", input.recordId)
        .eq("target_type", input.connectionType)
        .eq("target_id", input.connectionId);

      if (linkError) {
        console.error("Failed to remove file entity link:", linkError);
        return { success: false, error: linkError.message };
      }

      const { data: fileRow } = await supabase
        .from("files")
        .select("person_id, organization_id")
        .eq("id", input.recordId)
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (fileRow) {
        const legacyUpdate: Record<string, string | null> = {
          updated_at: new Date().toISOString(),
        };

        if (input.connectionType === "person" && fileRow.person_id === input.connectionId) {
          legacyUpdate.person_id = null;
        }

        if (input.connectionType === "org" && fileRow.organization_id === input.connectionId) {
          legacyUpdate.organization_id = null;
        }

        if (Object.keys(legacyUpdate).length > 1) {
          const { error: legacyError } = await supabase
            .from("files")
            .update(legacyUpdate)
            .eq("id", input.recordId)
            .eq("workspace_id", workspace.id);

          if (legacyError) {
            console.error("Failed to clear file legacy connection:", legacyError);
            return { success: false, error: legacyError.message };
          }
        }
      }

      revalidatePath("/files");
      return { success: true };
    }

    return {
      success: false,
      error: "Only people, organizations, and work connections can be removed from files",
    };
  }

  if (input.connectionType === "conversation") {
    return { success: false, error: "Conversations are automatically linked to their participants" };
  }

  const result = await deleteEdgeBetween(supabase, {
    workspaceId: workspace.id,
    a: { type: input.recordKind, id: input.recordId },
    b: { type: input.connectionType, id: input.connectionId },
    // Mentions belong to the note that made them and re-sync from its content
    // — only manual/care edges are removable here.
    relationType: "related",
  });

  if (!result.ok) {
    console.error("Failed to remove connection:", result.message);
    return { success: false, error: result.message };
  }

  // Revalidate both source and target paths for bidirectional visibility
  const sourcePath = getEntityPath(input.recordKind, input.recordId);
  const targetPath = getEntityPath(input.connectionType, input.connectionId);
  if (sourcePath) revalidatePath(sourcePath);
  if (targetPath) revalidatePath(targetPath);

  return { success: true };
}
