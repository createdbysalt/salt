/**
 * Admission-signal extraction from envelope extracted data.
 *
 * The category email adapters write `isSentByUser` / `is_reply`, while older
 * payload shapes carried `you_initiated` / `in_reply_to`. The admission gate
 * historically read only the legacy keys, so "you initiated" (+40) and
 * "reply" (+35) never scored for adapter-shaped captures and nearly all mail
 * landed as noise. Read both spellings.
 */

export interface AdmissionSignalFields {
  threadId: string | null;
  youInitiated: boolean;
  isReply: boolean;
}

export function extractAdmissionSignals(
  extracted: Record<string, unknown> | null | undefined
): AdmissionSignalFields {
  if (!extracted || typeof extracted !== "object") {
    return { threadId: null, youInitiated: false, isReply: false };
  }

  const threadId =
    typeof extracted.thread_id === "string" && extracted.thread_id
      ? extracted.thread_id
      : null;

  const youInitiated =
    extracted.isSentByUser === true || extracted.you_initiated === true;

  const isReply =
    extracted.is_reply === true ||
    Boolean(
      typeof extracted.in_reply_to === "string" && extracted.in_reply_to
    );

  return { threadId, youInitiated, isReply };
}
