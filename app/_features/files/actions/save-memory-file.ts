"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  findOrCreateClient,
  resolveClientFromPerson,
  slugifyProjectName,
} from "@/app/_features/capture/services/system-plays/project-fields";
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

async function resolveClientIdForDraft(
  workspaceId: string,
  draft: MemoryFileDraft,
): Promise<string> {
  const admin = createAdminClient();

  if (draft.person?.id) {
    return resolveClientFromPerson(admin, workspaceId, draft.person.id);
  }

  const name = draft.personName?.trim() || draft.person?.name || "General";
  return findOrCreateClient(admin, workspaceId, {
    name,
    slug: slugifyProjectName(name),
  });
}

export async function saveMemoryFileAction(
  draftInput: MemoryFileDraft,
  formData?: FormData,
): Promise<ActionResult<SaveMemoryFileResult>> {
  try {
    const { workspace } = await getWorkspaceContext();
    const draft = MemoryFileDraftSchema.parse(draftInput);
    const clientId = await resolveClientIdForDraft(workspace.id, draft);

    if (draft.fileType === "link") {
      const result = await createClientLink({
        clientId,
        name: draft.fileName,
        url: draft.externalUrl!,
        projectId: draft.work?.id,
        description: draft.description,
        category: draft.category,
      });

      if (!result.success || !result.fileId) {
        return { ok: false, message: result.error ?? "Could not save link" };
      }

      revalidatePath("/files");
      return {
        ok: true,
        data: { fileId: result.fileId, href: `/files?preview=${result.fileId}` },
      };
    }

    const file = formData?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Attachment missing. Re-attach the file and try again." };
    }

    const uploadFormData = new FormData();
    uploadFormData.set("file", file);

    const result = await uploadClientFile(uploadFormData, {
      clientId,
      projectId: draft.work?.id,
      description: draft.description,
      category: draft.category,
    });

    if (!result.success || !result.fileId) {
      return { ok: false, message: result.error ?? "Could not save file" };
    }

    revalidatePath("/files");
    return {
      ok: true,
      data: { fileId: result.fileId, href: `/files?preview=${result.fileId}` },
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
