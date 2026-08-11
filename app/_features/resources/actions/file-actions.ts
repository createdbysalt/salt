"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { FileCategory } from "../data";
import type { FileDetailRecord, FileActivityEvent } from "../detail-types";
import { validateFileLinkUrl, validateRecordName } from "@/app/_features/memory/utils/record-name";
import {
  getFileDetail,
  getFileActivityFeed,
} from "../directory-queries";
import { setFileWorkLink } from "../utils/work-links";

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
          .from("work")
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

    let personId: string | null = null;
    let organizationId: string | null = null;
    let projectId: string | null = null;

    if (target.kind === "person") {
      const { data: person, error } = await admin
        .from("people")
        .select("id")
        .eq("id", target.id)
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!person) throw new Error("Person not found");

      personId = person.id;
    } else if (target.kind === "org") {
      const { data: org, error } = await admin
        .from("organizations")
        .select("id")
        .eq("id", target.id)
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!org) throw new Error("Organization not found");

      organizationId = org.id;
    } else {
      const { data: project, error } = await admin
        .from("work")
        .select("id, person_id, organization_id")
        .eq("id", target.id)
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!project) throw new Error("Work item not found");

      projectId = project.id;
      personId = (project.person_id as string | null) ?? null;
      organizationId = (project.organization_id as string | null) ?? null;
    }

    const { error: updateError } = await supabase
      .from("resources")
      .update({
        person_id: personId,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    const linkResult = await setFileWorkLink(supabase, workspace.id, fileId, projectId);
    if (!linkResult.ok) {
      return { ok: false, message: linkResult.message };
    }

    revalidatePath("/resources");
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
      .from("resources")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id)
      .is("archived_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/resources");
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
      .from("resources")
      .update({ category, updated_at: new Date().toISOString() })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/resources");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not update category",
    };
  }
}

const ALLOWED_FILE_FIELDS = [
  "title",
  "url",
  "category",
  "document_type",
  "lifecycle_status",
  "due_date",
  "expiry_date",
  "signed_date",
  "follow_up_date",
  "total_amount_cents",
  "currency",
  "description",
  "is_operator_asset",
] as const;

type AllowedFileField = (typeof ALLOWED_FILE_FIELDS)[number];

const FILE_FIELD_TO_COLUMN: Record<AllowedFileField, string> = {
  title: "file_name",
  url: "external_url",
  category: "category",
  document_type: "document_type",
  lifecycle_status: "lifecycle_status",
  due_date: "due_date",
  expiry_date: "expiry_date",
  signed_date: "signed_date",
  follow_up_date: "follow_up_date",
  total_amount_cents: "total_amount_cents",
  currency: "currency",
  description: "description",
  is_operator_asset: "is_operator_asset",
};

function normalizeFileFieldValue(
  field: AllowedFileField,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (field === "url") {
    if (typeof value !== "string") {
      return { ok: false, message: "Link URL is required" };
    }
    const validated = validateFileLinkUrl(value);
    if (!validated.ok) return validated;
    return { ok: true, value: validated.url };
  }

  if (field === "title") {
    if (typeof value !== "string") {
      return { ok: false, message: "Name is required" };
    }
    const validated = validateRecordName(value);
    if (!validated.ok) return validated;
    return { ok: true, value: validated.name };
  }

  if (field === "is_operator_asset") {
    if (typeof value !== "boolean") {
      return { ok: false, message: "My business asset must be on or off" };
    }
    return { ok: true, value };
  }

  return { ok: true, value };
}

export async function updateMemoryFileField(
  fileId: string,
  field: string,
  value: unknown,
): Promise<ActionResult> {
  try {
    if (!ALLOWED_FILE_FIELDS.includes(field as AllowedFileField)) {
      return { ok: false, message: `Field "${field}" is not allowed` };
    }

    const allowedField = field as AllowedFileField;
    const normalized = normalizeFileFieldValue(allowedField, value);
    if (!normalized.ok) {
      return { ok: false, message: normalized.message };
    }

    const { workspace } = await getWorkspaceContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from("resources")
      .update({
        [FILE_FIELD_TO_COLUMN[allowedField]]: normalized.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId)
      .eq("workspace_id", workspace.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/resources");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `Could not update ${field}`,
    };
  }
}

// ============================================================================
// File Detail Fetching (for client components)
// ============================================================================

import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";

export type FileDetailData = {
  detail: FileDetailRecord;
  activities: FileActivityEvent[];
  supplementalActivity: ProfileActivityTimelineEntry[];
  sourceHistory: SourceHistoryEntry[];
};

export async function logFileViewActivity(fileId: string): Promise<ActionResult> {
  try {
    const { workspace, supabase, userId } = await getWorkspaceContext();

    const { error } = await supabase.from("resource_activities").insert({
      workspace_id: workspace.id,
      resource_id: fileId,
      activity_type: "viewed",
      actor_id: userId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not log file view",
    };
  }
}

export async function fetchFileDetailData(
  fileId: string,
): Promise<ActionResult<FileDetailData>> {
  try {
    const [detail, activityFeed] = await Promise.all([
      getFileDetail(fileId),
      getFileActivityFeed(fileId),
    ]);

    if (!detail) {
      return { ok: false, message: "File not found" };
    }

    return {
      ok: true,
      data: {
        detail,
        activities: activityFeed.activities,
        supplementalActivity: activityFeed.supplementalActivity,
        sourceHistory: activityFeed.sourceHistory,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not fetch file details",
    };
  }
}
