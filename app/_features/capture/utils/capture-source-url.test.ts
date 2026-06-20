import { describe, it, expect } from "vitest";
import {
  buildGmailInboxUrl,
  resolveCaptureSourceUrl,
} from "./capture-source-url";

describe("buildGmailInboxUrl", () => {
  it("prefers thread id over message id", () => {
    expect(
      buildGmailInboxUrl({
        threadId: "thread-abc",
        messageId: "msg-xyz",
      })
    ).toBe("https://mail.google.com/mail/u/0/#inbox/thread-abc");
  });

  it("falls back to message id", () => {
    expect(buildGmailInboxUrl({ messageId: "msg-xyz" })).toBe(
      "https://mail.google.com/mail/u/0/#inbox/msg-xyz"
    );
  });

  it("returns null when no ids", () => {
    expect(buildGmailInboxUrl({})).toBeNull();
  });
});

describe("resolveCaptureSourceUrl", () => {
  it("builds gmail url from capture row fields", () => {
    expect(
      resolveCaptureSourceUrl({
        sourceType: "gmail",
        sourceExternalId: "msg-1",
        extractedData: { type: "message", thread_id: "thread-1" },
      })
    ).toBe("https://mail.google.com/mail/u/0/#inbox/thread-1");
  });

  it("returns null for unsupported sources", () => {
    expect(
      resolveCaptureSourceUrl({
        sourceType: "stripe",
        sourceExternalId: "inv_123",
      })
    ).toBeNull();
  });
});
