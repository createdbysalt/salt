import { afterEach, describe, expect, it, vi } from "vitest";
import {
  verifyGmailPubSubOidcToken,
  verifyRecallCalendarSvixSignature,
} from "./webhook-verify";

describe("webhook verification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects recall calendar webhook without svix headers in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECALL_CALENDAR_WEBHOOK_SECRET", "test_secret");

    const valid = verifyRecallCalendarSvixSignature("{}", {
      svixId: null,
      svixTimestamp: null,
      svixSignature: null,
    });

    expect(valid).toBe(false);
  });

  it("allows gmail webhook skip flag in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("GMAIL_PUBSUB_SKIP_VERIFICATION", "true");

    const valid = await verifyGmailPubSubOidcToken(null);
    expect(valid).toBe(true);
  });
});
