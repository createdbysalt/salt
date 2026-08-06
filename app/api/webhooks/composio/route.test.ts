import { describe, it, expect } from "vitest";

// Re-implement the normalizer for testing (extracted from route.ts)
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

interface NormalizedTriggerEvent {
  kind: "trigger" | "connected_account_expired" | "trigger_disabled" | "unknown";
  triggerSlug: string | null;
  connectedAccountId: string | null;
  payload: unknown;
}

function normalizeWebhookEvent(body: unknown): NormalizedTriggerEvent {
  if (!isRecord(body)) {
    return { kind: "unknown", triggerSlug: null, connectedAccountId: null, payload: null };
  }

  const type = str(body.type) ?? str(body.event) ?? "";
  const data = isRecord(body.data) ? body.data : body;
  const metadata = isRecord(body.metadata) ? body.metadata : (isRecord(data.metadata) ? data.metadata : null);

  // V3 webhook format: metadata.connected_account_id (snake_case, direct field)
  // V4 SDK format: metadata.connectedAccount.id (nested object, camelCase)
  // Legacy formats: data.connectedAccountId or data.connected_account_id
  const connectedAccountId =
    // V3 webhook: body.metadata.connected_account_id (snake_case)
    (metadata ? str(metadata.connected_account_id) : null) ??
    // V4 SDK: body.metadata.connectedAccount.id (nested object)
    (metadata && isRecord(metadata.connectedAccount) ? str(metadata.connectedAccount.id) : null) ??
    // Legacy: data.connectedAccountId or data.connected_account_id
    str(data.connected_account_id) ??
    str(data.connectedAccountId) ??
    (isRecord(data.connectedAccount) ? str(data.connectedAccount.id) : null) ??
    // V2 fallback: data.metadata.connectedAccount.id
    (isRecord(data.metadata) && isRecord(data.metadata.connectedAccount)
      ? str(data.metadata.connectedAccount.id)
      : null);

  if (type.includes("connected_account.expired")) {
    return { kind: "connected_account_expired", triggerSlug: null, connectedAccountId, payload: data };
  }

  if (type.includes("trigger.disabled")) {
    const disabledSlug =
      str(data.trigger_slug) ?? str(data.triggerSlug) ?? str(data.id);
    return {
      kind: "trigger_disabled",
      triggerSlug: disabledSlug,
      connectedAccountId,
      payload: data,
    };
  }

  const triggerSlug =
    str(body.triggerSlug) ??
    str(data.trigger_slug) ??
    str(data.triggerSlug) ??
    (metadata ? str(metadata.trigger_slug) ?? str(metadata.triggerSlug) : null) ??
    (isRecord(data.metadata) ? str(data.metadata.trigger_slug) ?? str(data.metadata.triggerSlug) : null);

  const payload = isRecord(body.payload) ? body.payload : (isRecord(data.payload) ? data.payload : data);

  if (triggerSlug) {
    return { kind: "trigger", triggerSlug, connectedAccountId, payload };
  }
  return { kind: "unknown", triggerSlug: null, connectedAccountId, payload: data };
}

describe("normalizeWebhookEvent", () => {
  it("handles V4 format with triggerSlug at root and metadata.connectedAccount", () => {
    const v4Payload = {
      id: "ti_abc123",
      uuid: "uuid-123",
      triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
      toolkitSlug: "gmail",
      userId: "user-123",
      payload: {
        messageId: "msg-123",
        subject: "Test email",
        from: "test@example.com",
      },
      metadata: {
        id: "ti_abc123",
        uuid: "uuid-123",
        toolkitSlug: "gmail",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        connectedAccount: {
          id: "ca_RrnVw85mM8H8",
          uuid: "ca-uuid",
          authConfigId: "auth-123",
          authConfigUUID: "auth-uuid",
          userId: "user-123",
          status: "ACTIVE",
        },
      },
    };

    const result = normalizeWebhookEvent(v4Payload);

    expect(result.kind).toBe("trigger");
    expect(result.triggerSlug).toBe("GMAIL_NEW_GMAIL_MESSAGE");
    expect(result.connectedAccountId).toBe("ca_RrnVw85mM8H8");
    expect(result.payload).toEqual({
      messageId: "msg-123",
      subject: "Test email",
      from: "test@example.com",
    });
  });

  it("handles V3 webhook format with metadata.connected_account_id (snake_case)", () => {
    const v3WebhookPayload = {
      id: "msg_123",
      timestamp: "2026-07-13T08:00:00Z",
      type: "composio.trigger.event",
      triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
      metadata: {
        log_id: "log_123",
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        trigger_id: "ti_abc",
        connected_account_id: "ca_webhook789",
        auth_config_id: "auth_123",
        user_id: "user_123",
      },
      data: {
        messageId: "msg-456",
      },
    };

    const result = normalizeWebhookEvent(v3WebhookPayload);

    expect(result.kind).toBe("trigger");
    expect(result.triggerSlug).toBe("GMAIL_NEW_GMAIL_MESSAGE");
    expect(result.connectedAccountId).toBe("ca_webhook789");
  });

  it("handles legacy format with data.connectedAccountId", () => {
    const legacyPayload = {
      type: "trigger.event",
      data: {
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        connectedAccountId: "ca_xyz789",
        payload: {
          messageId: "msg-456",
        },
      },
    };

    const result = normalizeWebhookEvent(legacyPayload);

    expect(result.kind).toBe("trigger");
    expect(result.triggerSlug).toBe("GMAIL_NEW_GMAIL_MESSAGE");
    expect(result.connectedAccountId).toBe("ca_xyz789");
  });

  it("handles V2 format with snake_case", () => {
    const v2Payload = {
      data: {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        connected_account_id: "ca_old123",
        payload: { test: true },
      },
    };

    const result = normalizeWebhookEvent(v2Payload);

    expect(result.kind).toBe("trigger");
    expect(result.triggerSlug).toBe("GMAIL_NEW_GMAIL_MESSAGE");
    expect(result.connectedAccountId).toBe("ca_old123");
  });

  it("returns unknown for unrecognized format", () => {
    const weirdPayload = {
      something: "else",
      noTriggerInfo: true,
    };

    const result = normalizeWebhookEvent(weirdPayload);

    expect(result.kind).toBe("unknown");
    expect(result.triggerSlug).toBeNull();
  });
});
