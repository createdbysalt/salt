import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";

export const BILLING_DOCUMENTS_BUCKET = "billing-documents";

const SIGNED_URL_TTL_SECONDS = 3600;

/** Strip optional `billing-documents/` prefix from stored extraction paths. */
export function resolveBillingDocumentStoragePath(sourceDocId: string): string {
  const trimmed = sourceDocId.trim();
  const prefix = `${BILLING_DOCUMENTS_BUCKET}/`;
  if (trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length);
  }
  return trimmed;
}

export function isBillingDocumentPathForWorkspace(
  objectPath: string,
  workspaceId: string,
): boolean {
  return objectPath.startsWith(`workspace/${workspaceId}/`);
}

export async function createBillingDocumentSignedUrl(
  workspaceId: string,
  sourceDocId: string | undefined | null,
): Promise<string | null> {
  if (!sourceDocId?.trim()) return null;

  const objectPath = resolveBillingDocumentStoragePath(sourceDocId);
  if (!isBillingDocumentPathForWorkspace(objectPath, workspaceId)) {
    return null;
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error(
      "[billing] document signed URL admin client unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  const { data, error } = await supabase.storage
    .from(BILLING_DOCUMENTS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("[billing] document signed URL error:", error.message);
    return null;
  }

  return data.signedUrl;
}
