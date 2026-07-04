import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyComposioWebhookSignature } from "./webhook-signature";

const SECRET = "test_secret_key";
const BODY = JSON.stringify({ type: "composio.trigger.message", data: {} });

function sign(id: string, timestamp: string, body: string, secret = SECRET) {
  return (
    "v1," +
    createHmac("sha256", secret).update(`${id}.${timestamp}.${body}`).digest("base64")
  );
}

describe("composio webhook signature", () => {
  const now = 1_800_000_000_000;
  const ts = String(Math.floor(now / 1000));

  it("accepts a valid signature within tolerance", () => {
    expect(
      verifyComposioWebhookSignature(
        BODY,
        {
          webhookId: "msg_1",
          webhookTimestamp: ts,
          webhookSignature: sign("msg_1", ts, BODY),
        },
        SECRET,
        { nowMs: now },
      ),
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      verifyComposioWebhookSignature(
        BODY + "x",
        {
          webhookId: "msg_1",
          webhookTimestamp: ts,
          webhookSignature: sign("msg_1", ts, BODY),
        },
        SECRET,
        { nowMs: now },
      ),
    ).toBe(false);
  });

  it("rejects stale timestamps (replay defense)", () => {
    const staleTs = String(Math.floor(now / 1000) - 3600);
    expect(
      verifyComposioWebhookSignature(
        BODY,
        {
          webhookId: "msg_1",
          webhookTimestamp: staleTs,
          webhookSignature: sign("msg_1", staleTs, BODY),
        },
        SECRET,
        { nowMs: now },
      ),
    ).toBe(false);
  });

  it("rejects missing headers and wrong secrets, fails closed", () => {
    expect(
      verifyComposioWebhookSignature(
        BODY,
        { webhookId: null, webhookTimestamp: ts, webhookSignature: sign("m", ts, BODY) },
        SECRET,
        { nowMs: now },
      ),
    ).toBe(false);
    expect(
      verifyComposioWebhookSignature(
        BODY,
        {
          webhookId: "msg_1",
          webhookTimestamp: ts,
          webhookSignature: sign("msg_1", ts, BODY, "other_secret"),
        },
        SECRET,
        { nowMs: now },
      ),
    ).toBe(false);
  });

  it("accepts multi-signature headers from key rotation", () => {
    const rotated =
      sign("msg_1", ts, BODY, "old_secret") + " " + sign("msg_1", ts, BODY);
    expect(
      verifyComposioWebhookSignature(
        BODY,
        { webhookId: "msg_1", webhookTimestamp: ts, webhookSignature: rotated },
        SECRET,
        { nowMs: now },
      ),
    ).toBe(true);
  });
});
