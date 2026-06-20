import type { CaptureSourceType } from "../types";

export interface GmailLinkIds {
  threadId?: string | null;
  messageId?: string | null;
}

/** Opens the Gmail thread (or message) in the user's inbox. */
export function buildGmailInboxUrl(ids: GmailLinkIds): string | null {
  const id = ids.threadId?.trim() || ids.messageId?.trim();
  if (!id) return null;
  return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(id)}`;
}

export function resolveCaptureSourceUrl(input: {
  sourceType: CaptureSourceType;
  sourceExternalId?: string | null;
  extractedData?: unknown;
}): string | null {
  if (input.sourceType === "gmail") {
    const extracted =
      input.extractedData &&
      typeof input.extractedData === "object" &&
      !Array.isArray(input.extractedData)
        ? (input.extractedData as { thread_id?: string })
        : null;

    return buildGmailInboxUrl({
      threadId: extracted?.thread_id,
      messageId: input.sourceExternalId,
    });
  }

  return null;
}
