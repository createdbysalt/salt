import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  decodeComposioOAuthState,
  encodeComposioOAuthState,
} from "./oauth-state";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

describe("composio oauth state", () => {
  beforeAll(() => {
    process.env.COMPOSIO_OAUTH_STATE_SECRET = "test-composio-oauth-state-secret";
  });

  const basePayload = {
    userId: "user-123",
    workspaceId: "workspace-456",
    provider: "gmail" as const,
    returnUrl: connectorsPageUrl(),
  };

  it("round-trips signed state", () => {
    const encoded = encodeComposioOAuthState(basePayload);
    const decoded = decodeComposioOAuthState(encoded);

    expect(decoded).toMatchObject(basePayload);
  });

  it("rejects tampered signatures", () => {
    const encoded = encodeComposioOAuthState(basePayload);
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as { payload: unknown; signature: string };
    parsed.signature = `${parsed.signature}x`;
    const tampered = Buffer.from(JSON.stringify(parsed)).toString("base64url");
    expect(decodeComposioOAuthState(tampered)).toBeNull();
  });

  it("rejects open redirect return URLs", () => {
    const encoded = encodeComposioOAuthState({
      ...basePayload,
      returnUrl: "https://evil.example/phish",
    });

    const decoded = decodeComposioOAuthState(encoded);
    expect(decoded?.returnUrl).toBe(connectorsPageUrl());
  });

  it("rejects expired state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const encoded = encodeComposioOAuthState(basePayload);
    vi.setSystemTime(new Date("2026-01-01T12:16:00Z"));
    expect(decodeComposioOAuthState(encoded)).toBeNull();
    vi.useRealTimers();
  });
});
