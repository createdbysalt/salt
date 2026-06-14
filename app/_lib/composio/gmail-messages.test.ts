import { describe, expect, it } from "vitest";
import { normalizeComposioGmailMessage } from "./gmail-messages";

describe("normalizeComposioGmailMessage", () => {
  it("maps metadata-only Composio rows into GmailMessage headers", () => {
    const normalized = normalizeComposioGmailMessage({
      id: "msg-1",
      threadId: "thread-1",
      labelIds: ["INBOX", "UNREAD"],
      sender: "Alex Client <alex@example.com>",
      to: "hello@createdbysalt.com",
      subject: "Project kickoff",
      preview: { snippet: "Looking forward to starting next week." },
    });

    expect(normalized?.id).toBe("msg-1");
    expect(normalized?.snippet).toContain("Looking forward");
    expect(
      normalized?.payload.headers.find((h) => h.name === "From")?.value
    ).toContain("alex@example.com");
    expect(
      normalized?.payload.headers.find((h) => h.name === "Subject")?.value
    ).toBe("Project kickoff");
  });

  it("passes through native Gmail API payloads unchanged", () => {
    const native = {
      id: "msg-2",
      threadId: "thread-2",
      labelIds: ["SENT"],
      snippet: "Thanks!",
      historyId: "1",
      internalDate: "1710000000000",
      payload: {
        partId: "",
        mimeType: "text/plain",
        filename: "",
        headers: [{ name: "Subject", value: "Thanks!" }],
        body: { size: 6 },
      },
      sizeEstimate: 6,
    };

    expect(normalizeComposioGmailMessage(native)).toEqual(native);
  });
});
