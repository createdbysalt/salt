"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  createClientLink,
  uploadClientFile,
} from "@/app/_features/people/actions/files/upload-client-file";
import {
  MemoryFileDraftSchema,
  type MemoryFileDraft,
  type SaveMemoryFileResult,
} from "./memory-file-draft";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

async function resolvePersonIdForDraft(
  workspaceId: string,
  draft: MemoryFileDraft,
): Promise<string | null> {
  if (!draft.person?.id) return null;

  const admin = createAdminClient();
  const { data: person, error } = await admin
    .from("people")
    .select("id")
    .eq("id", draft.person.id)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return person?.id ?? null;
}

export async function saveMemoryFileAction(
  draftInput: MemoryFileDraft,
  formData?: FormData,
): Promise<ActionResult<SaveMemoryFileResult>> {
  try {
    const { workspace } = await getWorkspaceContext();
    const draft = MemoryFileDraftSchema.parse(draftInput);
    const personId = await resolvePersonIdForDraft(workspace.id, draft);

    if (draft.fileType === "link") {
      const result = await createClientLink({
        personId,
        name: draft.fileName,
        url: draft.externalUrl!,
        projectId: draft.work?.id,
        description: draft.description,
        category: draft.category,
      });

      if (!result.success || !result.fileId) {
        return { ok: false, message: result.error ?? "Could not save link" };
      }

      revalidatePath("/resources");
      return {
        ok: true,
        data: { fileId: result.fileId, href: `/resources?preview=${result.fileId}` },
      };
    }

    const file = formData?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Attachment missing. Re-attach the file and try again." };
    }

    const uploadFormData = new FormData();
    uploadFormData.set("file", file);

    const result = await uploadClientFile(uploadFormData, {
      personId,
      projectId: draft.work?.id,
      description: draft.description,
      category: draft.category,
    });

    if (!result.success || !result.fileId) {
      return { ok: false, message: result.error ?? "Could not save file" };
    }

    revalidatePath("/resources");
    return {
      ok: true,
      data: { fileId: result.fileId, href: `/resources?preview=${result.fileId}` },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: error.errors[0]?.message ?? "Invalid file draft" };
    }
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Could not save file" };
  }
}
