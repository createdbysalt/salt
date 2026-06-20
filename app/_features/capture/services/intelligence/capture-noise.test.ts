import { describe, expect, it } from "vitest";
import {
  buildNoiseInputFromGmailMessage,
  classifyCaptureNoise,
  type CaptureNoiseInput,
} from "./capture-noise";
import type { GmailMessage } from "@/app/_lib/composio/types";

function gmailMessage(overrides: Partial<GmailMessage> & { headers?: Record<string, string> }): GmailMessage {
  const headerEntries = Object.entries(overrides.headers ?? {});
  const { headers: _headers, ...rest } = overrides;
  return {
    id: "msg-1",
    threadId: "thread-1",
    snippet: "Preview text",
    labelIds: ["INBOX"],
    historyId: "1",
    internalDate: String(Date.now()),
    sizeEstimate: 100,
    payload: {
      partId: "",
      mimeType: "text/plain",
      filename: "",
      body: { size: 0 },
      headers: headerEntries.map(([name, value]) => ({ name, value })),
    },
    ...rest,
  };
}

function baseInput(overrides: Partial<CaptureNoiseInput>): CaptureNoiseInput {
  return {
    sourceType: "gmail",
    fromEmail: "client@example.com",
    subject: "Project update",
    bodyText: "Can we review the homepage?",
    labels: ["INBOX"],
    headers: {},
    isSentByUser: false,
    ...overrides,
  };
}

describe("classifyCaptureNoise", () => {
  it("flags Gmail promotion category", () => {
    const result = classifyCaptureNoise(
      baseInput({ labels: ["INBOX", "CATEGORY_PROMOTIONS"] })
    );
    expect(result.isNoise).toBe(true);
    if (result.isNoise) {
      expect(result.category).toBe("promotion");
    }
  });

  it("flags bulk marketing with one-click unsubscribe", () => {
    const result = classifyCaptureNoise(
      baseInput({
        fromEmail: "deals@brand.com",
        headers: {
          "list-unsubscribe": "<mailto:unsub@brand.com>",
          "list-unsubscribe-post": "List-Unsubscribe=One-Click",
        },
      })
    );
    expect(result.isNoise).toBe(true);
    if (result.isNoise) {
      expect(result.category).toBe("promotion");
    }
  });

  it("flags newsletter list-unsubscribe alone", () => {
    const result = classifyCaptureNoise(
      baseInput({
        headers: { "list-unsubscribe": "<https://example.com/unsub>" },
      })
    );
    expect(result.isNoise).toBe(true);
    if (result.isNoise) {
      expect(result.category).toBe("newsletter");
    }
  });

  it("does not flag QuickBooks payment rails as noise", () => {
    const result = classifyCaptureNoise(
      baseInput({
        fromEmail: "businessservices@intuit.com",
        subject: "Money on the way!",
        bodyText: "Your QuickBooks Payments deposit is on the way.",
      })
    );
    expect(result.isNoise).toBe(false);
  });

  it("does not flag real client mail in primary inbox", () => {
    const result = classifyCaptureNoise(
      baseInput({
        fromEmail: "joshheyes@findhope.tv",
        subject: "Re: MFI Canada Resource Hub",
        bodyText:
          "Hey Gabi, Quick question for you. Do I need to instruct people to submit one form per resource?",
      })
    );
    expect(result.isNoise).toBe(false);
  });

  it("flags social notification domains", () => {
    const result = classifyCaptureNoise(
      baseInput({ fromEmail: "updates@linkedin.com" })
    );
    expect(result.isNoise).toBe(true);
    if (result.isNoise) {
      expect(result.category).toBe("social");
    }
  });
});

describe("buildNoiseInputFromGmailMessage", () => {
  it("maps Gmail headers and labels into noise input", () => {
    const input = buildNoiseInputFromGmailMessage(
      gmailMessage({
        headers: {
          From: "Brand <promo@brand.com>",
          Subject: "50% off today",
          "List-Unsubscribe": "<mailto:unsub@brand.com>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        labelIds: ["INBOX"],
      })
    );

    expect(input.fromEmail).toBe("promo@brand.com");
    expect(classifyCaptureNoise(input).isNoise).toBe(true);
  });
});
