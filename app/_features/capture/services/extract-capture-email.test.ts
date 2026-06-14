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
