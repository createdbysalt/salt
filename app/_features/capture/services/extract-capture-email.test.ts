import { describe, expect, it } from "vitest";
import type { GmailMessage } from "@/app/_lib/composio/types";
import type { MessageExtractedData } from "../types";
import {
  extractCaptureEmailFields,
  extractEmailToAnalyze,
} from "./extract-capture-email";

const gmailMessage: GmailMessage = {
  id: "msg-1",
  threadId: "thread-1",
  labelIds: ["INBOX"],
  snippet: "Can we move forward on the proposal?",
  historyId: "1",
  internalDate: "1710000000000",
  sizeEstimate: 100,
  payload: {
    partId: "",
    mimeType: "multipart/alternative",
    filename: "",
    headers: [
      { name: "From", value: "Mike Client <mike@newcompany.com>" },
      { name: "To", value: "you@studio.com" },
      { name: "Subject", value: "Ready to start the project" },
      { name: "Date", value: "Mon, 10 Mar 2025 12:00:00 +0000" },
    ],
    body: { size: 0 },
    parts: [
      {
        partId: "0",
        mimeType: "text/plain",
        filename: "",
        headers: [],
        body: {
          size: 42,
          data: Buffer.from("Let's move forward next week.", "utf-8").toString("base64"),
        },
      },
    ],
  },
};

describe("extractCaptureEmailFields", () => {
  it("reads nested Gmail headers from raw_payload", () => {
    const fields = extractCaptureEmailFields(gmailMessage as unknown as Record<string, unknown>);

    expect(fields).not.toBeNull();
    expect(fields?.from_email).toBe("mike@newcompany.com");
    expect(fields?.from_name).toBe("Mike Client");
    expect(fields?.subject).toBe("Ready to start the project");
    expect(fields?.body_text).toContain("move forward");
  });

  it("prefers extracted_data when present", () => {
    const extracted: MessageExtractedData = {
      type: "message",
      subject: "Buying intent",
      body_preview: "What would it cost for a full rebrand?",
      sender: { name: "Alex Prospect", email: "alex@client.co" },
      recipients: [{ email: "you@studio.com", type: "to" }],
      thread_id: "thread-2",
      labels: ["INBOX"],
    };

    const fields = extractCaptureEmailFields({}, extracted);

    expect(fields?.from_email).toBe("alex@client.co");
    expect(fields?.subject).toBe("Buying intent");
    expect(fields?.body_text).toContain("What would it cost");
  });

  it("returns null when no sender can be resolved", () => {
    expect(extractCaptureEmailFields({ snippet: "hello" })).toBeNull();
  });

  it("reads the category-adapter shape (Outlook) with no raw headers", () => {
    // Outlook webhook rows: raw_payload has only pointer fields, and
    // extracted_data uses the flat adapter shape without a `type` field.
    const adapterExtracted = {
      subject: "Invoice question",
      snippet: "Quick question about last month's invoice",
      sender_email: "Dana@Client.CO",
      sender_name: "Dana Client",
      to: ["you@studio.com"],
      cc: [],
      bcc: [],
      thread_id: "conv-9",
      isSentByUser: false,
      is_reply: true,
      has_attachments: false,
      attachments: [],
      deep_link: null,
    };

    const fields = extractCaptureEmailFields(
      { messageId: "AAMk-1", source: "composio_trigger" },
      adapterExtracted as never
    );

    expect(fields).not.toBeNull();
    expect(fields?.from_email).toBe("dana@client.co");
    expect(fields?.from_name).toBe("Dana Client");
    expect(fields?.subject).toBe("Invoice question");
    expect(fields?.snippet).toContain("Quick question");
    expect(fields?.thread_id).toBe("conv-9");
    expect(fields?.is_sent_by_user).toBe(false);
  });

  it("flags adapter-shape sent mail via isSentByUser", () => {
    const fields = extractCaptureEmailFields(
      { messageId: "AAMk-2" },
      {
        subject: "Re: proposal",
        snippet: "Sent from my studio",
        sender_email: "you@studio.com",
        sender_name: null,
        to: ["dana@client.co"],
        thread_id: "conv-10",
        isSentByUser: true,
      } as never
    );

    expect(fields?.is_sent_by_user).toBe(true);
  });

  it("prefers an explicit body_text over the snippet (inline backfill seam)", () => {
    // Sources plan 3.4: the backfill attaches the transient full body to the
    // in-memory row's extracted_data; it must win over the snippet fallback.
    const fields = extractCaptureEmailFields(
      { messageId: "msg-1", source: "composio_backfill" },
      {
        subject: "Proposal",
        snippet: "Short preview",
        sender_email: "alex@client.co",
        sender_name: "Alex",
        to: ["you@studio.com"],
        thread_id: "thread-9",
        isSentByUser: false,
        body_text: "Full body with signature\n\nAlex Client\n555-0100",
      } as never
    );

    expect(fields?.body_text).toBe(
      "Full body with signature\n\nAlex Client\n555-0100"
    );
  });

  it("falls back to the snippet when body_text is absent or empty", () => {
    const fields = extractCaptureEmailFields(
      { messageId: "msg-2" },
      {
        subject: "Hello",
        snippet: "Just the preview",
        sender_email: "alex@client.co",
        to: [],
        isSentByUser: false,
        body_text: "",
      } as never
    );

    expect(fields?.body_text).toBe("Just the preview");
  });
});

describe("extractEmailToAnalyze", () => {
  it("maps capture id onto analyzer input", () => {
    const email = extractEmailToAnalyze(
      "capture-123",
      gmailMessage as unknown as Record<string, unknown>
    );

    expect(email?.id).toBe("capture-123");
    expect(email?.from_email).toBe("mike@newcompany.com");
  });
});
