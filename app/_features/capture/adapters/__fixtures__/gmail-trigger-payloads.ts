/**
 * Golden payload fixtures for the Gmail capture adapter.
 *
 * PROVENANCE: synthesized 2026-07-03 from the Composio GMAIL_NEW_GMAIL_MESSAGE
 * trigger payload schema (SDK source + docs) — not yet captured live. When
 * the webhook ingress receives its first real payload, capture it here
 * verbatim (redact addresses) and delete this notice; if the live shape
 * differs, the conformance suite is the tripwire.
 */

/** Camel-case shape (documented v3 trigger payload). */
export const GMAIL_TRIGGER_CAMEL = {
  threadId: "197a2f0c8d4e1a2b",
  messageId: "197a2f0c8d4e1a2c",
  messageTimestamp: "2026-07-02T18:24:11Z",
  subject: "Kickoff agenda for next week",
  sender: "Ada Lovelace <ada@northwind.com>",
  to: "you@usesalt.io",
  labelIds: ["INBOX", "IMPORTANT"],
  preview: "Sharing the agenda ahead of Tuesday — three things to align on.",
  attachmentList: [],
};

/** Snake-case / nested `message` shape (older trigger envelope). */
export const GMAIL_TRIGGER_SNAKE_NESTED = {
  message: {
    message_id: "18f001aa42bc9911",
    thread_id: "18f001aa42bc9900",
    message_timestamp: "1782845051000",
    subject: "Invoice 0231 — final files attached",
    from: "billing@vendorworks.co",
    to: ["you@usesalt.io", "Ops <ops@usesalt.io>"],
    label_ids: ["INBOX"],
    message_text: "Final files attached. Invoice due net 30.",
  },
};

/** Sent-by-user message (labels drive isSentByUser). */
export const GMAIL_TRIGGER_SENT = {
  messageId: "197b3c1d9e5f2a3d",
  threadId: "197a2f0c8d4e1a2b",
  messageTimestamp: "2026-07-03T09:02:44Z",
  subject: "Re: Kickoff agenda for next week",
  sender: "You <you@usesalt.io>",
  to: "ada@northwind.com",
  labelIds: ["SENT"],
  preview: "Works for me — see you Tuesday.",
};

/** Promotions blast — ingestible shape, should be flagged by the noise gate. */
export const GMAIL_TRIGGER_PROMO = {
  messageId: "197c4d2eaf603b4e",
  threadId: "197c4d2eaf603b40",
  messageTimestamp: "2026-07-03T07:15:00Z",
  subject: "48 hours only: 40% off everything",
  sender: "Deals <noreply@megamart.example>",
  to: "you@usesalt.io",
  labelIds: ["INBOX", "CATEGORY_PROMOTIONS"],
  preview: "Don't miss out on our biggest sale of the season!",
};

/** Malformed: no message id anywhere — adapter must decline. */
export const GMAIL_TRIGGER_NO_ID = {
  threadId: "197d5e3fb0714c5f",
  subject: "Ghost payload",
  sender: "ghost@example.com",
};
