import type { GmailMessage } from "./types";

type ComposioGmailRow = Record<string, unknown>;

function header(name: string, value: string | undefined): { name: string; value: string } | null {
  if (!value) return null;
  return { name, value };
}

/**
 * Composio GMAIL_FETCH_EMAILS returns Gmail API shapes when verbose=true, but
 * metadata-only rows (include_payload=false) use flat sender/subject/to fields.
 */
export function normalizeComposioGmailMessage(raw: ComposioGmailRow): GmailMessage | null {
  const id = typeof raw.id === "string" ? raw.id : typeof raw.messageId === "string" ? raw.messageId : null;
  if (!id) return null;

  const existingPayload = raw.payload;
  if (
    existingPayload &&
    typeof existingPayload === "object" &&
    Array.isArray((existingPayload as { headers?: unknown }).headers)
  ) {
    return raw as unknown as GmailMessage;
  }

  const preview =
    raw.preview && typeof raw.preview === "object"
      ? (raw.preview as ComposioGmailRow)
      : null;

  const headers = [
    header("From", typeof raw.sender === "string" ? raw.sender : undefined),
    header("To", typeof raw.to === "string" ? raw.to : undefined),
    header("Subject", typeof raw.subject === "string" ? raw.subject : undefined),
    header("Date", typeof raw.date === "string" ? raw.date : undefined),
  ].filter((h): h is { name: string; value: string } => h !== null);

  const snippet =
    (typeof raw.snippet === "string" && raw.snippet) ||
    (typeof preview?.body === "string" && preview.body) ||
    (typeof preview?.snippet === "string" && preview.snippet) ||
    "";

  const internalDate =
    typeof raw.internalDate === "string" || typeof raw.internalDate === "number"
      ? String(raw.internalDate)
      : typeof raw.messageTimestamp === "string"
        ? raw.messageTimestamp
        : new Date().toISOString();

  return {
    id,
    threadId: typeof raw.threadId === "string" ? raw.threadId : "",
    labelIds: Array.isArray(raw.labelIds) ? (raw.labelIds as string[]) : [],
    snippet,
    historyId: typeof raw.historyId === "string" ? raw.historyId : "",
    internalDate,
    payload: {
      partId: "",
      mimeType: "text/plain",
      filename: "",
      headers,
      body: { size: snippet.length },
    },
    sizeEstimate: typeof raw.sizeEstimate === "number" ? raw.sizeEstimate : snippet.length,
  };
}

export function normalizeComposioGmailMessages(raw: unknown): GmailMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => normalizeComposioGmailMessage(row as ComposioGmailRow))
    .filter((message): message is GmailMessage => message !== null);
}
