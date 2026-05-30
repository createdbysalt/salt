export type ComposioAction<T, R> = (input: T) => Promise<R>;

// Basic Gmail types (can be expanded as needed)
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{ name: string; value: string }>;
    body: {
      size: number;
      data?: string; // Base64 URL encoded string
    };
    parts?: GmailMessagePart[];
  };
  sizeEstimate: number;
  raw?: string; // Base64 URL encoded string
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: Array<{ name: string; value: string }>;
  body: {
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailSendEmailInput {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: string;
  labelListVisibility: string;
  type: string;
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}
